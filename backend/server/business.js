import db from "./db.js";

let __idSeq = 10000;
const nid = (p) => `${p}-${(__idSeq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString();
const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();

/* ---------- helpers ---------- */

async function nextConsecutivo(key, prefix) {
  const row = await db.queryOne("SELECT valor FROM consecutivos WHERE tipo = $1", [key]);
  const next = (row?.valor || 0) + 1;
  await db.query(
    "INSERT INTO consecutivos (tipo, valor) VALUES ($1, $2) ON CONFLICT (tipo) DO UPDATE SET valor = $2",
    [key, next]
  );
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

async function pushAudit(actor, accion, detalle) {
  await db.query(
    "INSERT INTO auditLog (id, fecha, usuario, rol, accion, detalle) VALUES ($1, $2, $3, $4, $5, $6)",
    [nid("aud"), todayISO(), actor?.usuario || "API", actor?.rol || "-", accion, detalle]
  );
}

/* ---------- Consecutivos ---------- */

export async function getConsecutivo(tipo) {
  const row = await db.queryOne("SELECT valor FROM consecutivos WHERE tipo = $1", [tipo]);
  return row?.valor || 0;
}

export async function updateConsecutivo(tipo, valor) {
  await db.query(
    "INSERT INTO consecutivos (tipo, valor) VALUES ($1, $2) ON CONFLICT (tipo) DO UPDATE SET valor = $2",
    [tipo, valor]
  );
}

/* ---------- Auditoría ---------- */

export async function getAuditLog(filtros = {}) {
  let sql = "SELECT * FROM auditLog";
  const params = [];
  const conditions = [];
  
  if (filtros.usuario) {
    conditions.push(`usuario = $${params.length + 1}`);
    params.push(filtros.usuario);
  }
  if (filtros.fechaDesde) {
    conditions.push(`fecha >= $${params.length + 1}`);
    params.push(filtros.fechaDesde);
  }
  if (filtros.fechaHasta) {
    conditions.push(`fecha <= $${params.length + 1}`);
    params.push(filtros.fechaHasta);
  }
  
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY fecha DESC LIMIT 100";
  
  return await db.query(sql, params);
}

/* ---------- Productos ---------- */

export async function createProducto(data) {
  const existe = await db.queryOne("SELECT id FROM productos WHERE codigo = $1", [data.codigo]);
  if (existe) throw new Error(`El producto con código ${data.codigo} ya existe`);
  
  const id = nid("prod");
  await db.query(
    `INSERT INTO productos 
     (id, codigo, nombre, categoria, unidad, precio, costoPromedio, iva, tieneLote, minimo) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, data.codigo, data.nombre, data.categoria, data.unidad, 
     data.precio || 0, data.costoPromedio || 0, data.iva || 0, 
     data.tieneLote ? 1 : 0, data.minimo || 0]
  );
  
  return await db.queryOne("SELECT * FROM productos WHERE id = $1", [id]);
}

export async function getProductos(filtros = {}) {
  let sql = "SELECT * FROM productos";
  const params = [];
  const conditions = [];
  
  if (filtros.categoria) {
    conditions.push(`categoria = $${params.length + 1}`);
    params.push(filtros.categoria);
  }
  if (filtros.busqueda) {
    conditions.push(`(nombre ILIKE $${params.length + 1} OR codigo ILIKE $${params.length + 1})`);
    params.push(`%${filtros.busqueda}%`);
  }
  
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY nombre";
  
  return await db.query(sql, params);
}

export async function getProducto(id) {
  return await db.queryOne("SELECT * FROM productos WHERE id = $1", [id]);
}

export async function updateProducto(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;
  
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id') {
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }
  params.push(id);
  
  await db.query(
    `UPDATE productos SET ${fields.join(", ")} WHERE id = $${idx}`,
    params
  );
  
  return await db.queryOne("SELECT * FROM productos WHERE id = $1", [id]);
}

/* ---------- Terceros (Clientes/Proveedores) ---------- */

export async function createTercero(data) {
  const existe = await db.queryOne("SELECT id FROM terceros WHERE numDoc = $1", [data.numDoc]);
  if (existe) throw new Error(`El tercero con documento ${data.numDoc} ya existe`);
  
  const id = nid("ter");
  await db.query(
    `INSERT INTO terceros 
     (id, tipo, tipoDoc, numDoc, nombre, email, telefono, ciudad, 
      cupoCredito, condicionPagoDias, listaPrecios, saldoCartera, saldoCxP, creadoEn) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [id, data.tipo, data.tipoDoc, data.numDoc, data.nombre, 
     data.email, data.telefono, data.ciudad, 
     data.cupoCredito || 0, data.condicionPagoDias || 0, 
     data.listaPrecios || 'general', 0, 0, todayISO()]
  );
  
  return await db.queryOne("SELECT * FROM terceros WHERE id = $1", [id]);
}

export async function getTerceros(filtros = {}) {
  let sql = "SELECT * FROM terceros";
  const params = [];
  const conditions = [];
  
  if (filtros.tipo) {
    conditions.push(`tipo = $${params.length + 1}`);
    params.push(filtros.tipo);
  }
  if (filtros.busqueda) {
    conditions.push(`(nombre ILIKE $${params.length + 1} OR numDoc ILIKE $${params.length + 1})`);
    params.push(`%${filtros.busqueda}%`);
  }
  
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY nombre";
  
  return await db.query(sql, params);
}

export async function getTercero(id) {
  return await db.queryOne("SELECT * FROM terceros WHERE id = $1", [id]);
}

export async function updateTercero(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;
  
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id') {
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }
  params.push(id);
  
  await db.query(
    `UPDATE terceros SET ${fields.join(", ")} WHERE id = $${idx}`,
    params
  );
  
  return await db.queryOne("SELECT * FROM terceros WHERE id = $1", [id]);
}

/* ---------- Facturas ---------- */

export async function createFactura(data) {
  const id = nid("fac");
  const numero = await nextConsecutivo("factura", "FAC");
  
  await db.query(
    `INSERT INTO facturas 
     (id, numero, terceroId, sedeId, fecha, subtotal, iva, total, estado, items, pagos) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, numero, data.terceroId, data.sedeId, data.fecha || todayISO(),
     data.subtotal || 0, data.iva || 0, data.total || 0,
     data.estado || 'pendiente', data.items || [], data.pagos || []]
  );
  
  await pushAudit(data.actor, "Crear factura", `Factura ${numero} creada`);
  
  return await db.queryOne("SELECT * FROM facturas WHERE id = $1", [id]);
}

export async function getFacturas(filtros = {}) {
  let sql = "SELECT * FROM facturas";
  const params = [];
  const conditions = [];
  
  if (filtros.terceroId) {
    conditions.push(`terceroId = $${params.length + 1}`);
    params.push(filtros.terceroId);
  }
  if (filtros.estado) {
    conditions.push(`estado = $${params.length + 1}`);
    params.push(filtros.estado);
  }
  if (filtros.fechaDesde) {
    conditions.push(`fecha >= $${params.length + 1}`);
    params.push(filtros.fechaDesde);
  }
  if (filtros.fechaHasta) {
    conditions.push(`fecha <= $${params.length + 1}`);
    params.push(filtros.fechaHasta);
  }
  
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY fecha DESC";
  
  return await db.query(sql, params);
}

export async function getFactura(id) {
  return await db.queryOne("SELECT * FROM facturas WHERE id = $1", [id]);
}

export async function updateFacturaEstado(id, estado, actor) {
  await db.query("UPDATE facturas SET estado = $1 WHERE id = $2", [estado, id]);
  await pushAudit(actor, "Actualizar factura", `Factura ${id} -> ${estado}`);
  return await db.queryOne("SELECT * FROM facturas WHERE id = $1", [id]);
}

/* ---------- Stock / Inventario ---------- */

export async function getStock(productoId, bodegaId) {
  const row = await db.queryOne(
    "SELECT cantidad FROM productoStock WHERE productoId = $1 AND bodegaId = $2",
    [productoId, bodegaId]
  );
  return row?.cantidad || 0;
}

export async function updateStock(productoId, bodegaId, cantidad, tipo, origen, actor) {
  // Obtener stock actual
  const stockActual = await getStock(productoId, bodegaId);
  const nuevaCantidad = tipo === 'entrada' ? stockActual + cantidad : Math.max(0, stockActual - cantidad);
  
  // Actualizar stock
  await db.query(
    `INSERT INTO productoStock (productoId, bodegaId, cantidad) 
     VALUES ($1, $2, $3) 
     ON CONFLICT (productoId, bodegaId) 
     DO UPDATE SET cantidad = $3`,
    [productoId, bodegaId, nuevaCantidad]
  );
  
  // Registrar movimiento
  await db.query(
    `INSERT INTO movimientosInventario 
     (id, productoId, bodegaId, cantidad, tipo, origen, fecha, saldoResultante) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [nid("inv"), productoId, bodegaId, cantidad, tipo, origen, todayISO(), nuevaCantidad]
  );
  
  // Actualizar costo promedio si es entrada
  if (tipo === 'entrada') {
    const prod = await db.queryOne("SELECT costoPromedio FROM productos WHERE id = $1", [productoId]);
    if (prod) {
      // Fórmula simple: nuevo promedio ponderado
      const stockTotal = await db.queryOne(
        "SELECT SUM(cantidad) as total FROM productoStock WHERE productoId = $1",
        [productoId]
      );
      const totalStock = stockTotal?.total || 0;
      const nuevoCosto = totalStock > 0 
        ? (prod.costoPromedio * (totalStock - cantidad) + (origen?.costo || 0) * cantidad) / totalStock
        : prod.costoPromedio;
      
      await db.query(
        "UPDATE productos SET costoPromedio = $1 WHERE id = $2",
        [nuevoCosto, productoId]
      );
    }
  }
  
  return { productoId, bodegaId, cantidad: nuevaCantidad };
}

/* ---------- Empresa ---------- */

export async function getEmpresa() {
  return await db.queryOne("SELECT * FROM empresa LIMIT 1");
}

export async function updateEmpresa(data) {
  const existing = await getEmpresa();
  if (existing) {
    const fields = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
    await db.query(`UPDATE empresa SET ${fields.join(", ")} WHERE id = $1`, [existing.id, ...params]);
    return await getEmpresa();
  } else {
    const id = nid("emp");
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    await db.query(
      `INSERT INTO empresa (id, ${keys.join(", ")}) VALUES ($1, ${placeholders})`,
      [id, ...values]
    );
    return await getEmpresa();
  }
}

/* ---------- Usuarios ---------- */

export async function getUsuarios() {
  return await db.query("SELECT * FROM usuarios ORDER BY nombre");
}

export async function getUsuario(id) {
  return await db.queryOne("SELECT * FROM usuarios WHERE id = $1", [id]);
}

export async function createUsuario(data) {
  const id = nid("usr");
  await db.query(
    `INSERT INTO usuarios (id, email, password_hash, nombre, rol, activo, created_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, data.email, data.passwordHash, data.nombre, data.rol || 'consulta', data.activo === false ? 0 : 1, todayISO()]
  );
  return await getUsuario(id);
}

export async function updateUsuario(id, data) {
  // Mapeo explicito en vez de tomar cualquier clave de "data" como nombre
  // de columna: la version anterior armaba el UPDATE con
  // Object.entries(data) directo, lo que además de fallar (usaba
  // "passwordHash" en vez de "password_hash", que es el nombre real de la
  // columna) dejaba escribir en cualquier columna que alguien mandara en
  // el body sin validar.
  const fields = [];
  const params = [];
  let idx = 1;
  if (data.email !== undefined) { fields.push(`email = $${idx++}`); params.push(data.email); }
  if (data.nombre !== undefined) { fields.push(`nombre = $${idx++}`); params.push(data.nombre); }
  if (data.rol !== undefined) { fields.push(`rol = $${idx++}`); params.push(data.rol); }
  if (data.activo !== undefined) { fields.push(`activo = $${idx++}`); params.push(data.activo ? 1 : 0); }
  if (data.passwordHash) { fields.push(`password_hash = $${idx++}`); params.push(data.passwordHash); }
  if (fields.length === 0) return await getUsuario(id);
  params.push(id);

  await db.query(
    `UPDATE usuarios SET ${fields.join(", ")} WHERE id = $${idx}`,
    params
  );
  return await getUsuario(id);
}

/* ---------- Dashboard ---------- */

export async function getDashboardData() {
  const hoy = todayISO();
  const inicioMes = hoy.substring(0, 7) + "-01";
  
  // Ventas del mes
  const ventas = await db.queryOne(
    `SELECT COALESCE(SUM(total), 0) as total FROM facturas 
     WHERE fecha >= $1 AND estado = 'pagada'`,
    [inicioMes]
  );
  
  // Facturas pendientes
  const pendientes = await db.queryOne(
    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM facturas 
     WHERE estado = 'pendiente'`
  );
  
  // Productos con bajo stock
  const bajoStock = await db.query(
    `SELECT p.id, p.nombre, p.codigo, ps.cantidad 
     FROM productos p 
     JOIN productoStock ps ON p.id = ps.productoId 
     WHERE ps.cantidad <= p.minimo AND p.minimo > 0`
  );
  
  // Total clientes
  const clientes = await db.queryOne("SELECT COUNT(*) as count FROM terceros WHERE tipo = 'cliente'");
  
  return {
    ventasMes: ventas?.total || 0,
    pendientes: pendientes?.count || 0,
    totalPendiente: pendientes?.total || 0,
    bajoStock: bajoStock || [],
    totalClientes: clientes?.count || 0
  };
}

/* ---------- Bodegas ---------- */

export async function getBodegas() {
  return await db.query("SELECT * FROM bodegas ORDER BY nombre");
}

export async function createBodega(data) {
  const id = nid("bod");
  await db.query(
    "INSERT INTO bodegas (id, nombre, sedeId) VALUES ($1, $2, $3)",
    [id, data.nombre, data.sedeId || null]
  );
  return await db.queryOne("SELECT * FROM bodegas WHERE id = $1", [id]);
}

/* ---------- Sedes ---------- */

export async function getSedes() {
  return await db.query("SELECT * FROM sedes ORDER BY nombre");
}

export async function createSede(data) {
  const id = nid("sed");
  await db.query(
    "INSERT INTO sedes (id, nombre, ciudad) VALUES ($1, $2, $3)",
    [id, data.nombre, data.ciudad || null]
  );
  return await db.queryOne("SELECT * FROM sedes WHERE id = $1", [id]);
}

/* ---------- helpers de transaccion (version que corre DENTRO de una tx) ---------- */

async function nextConsecutivoTx(tx, key, prefix) {
  const row = await tx.queryOne("SELECT valor FROM consecutivos WHERE tipo = $1", [key]);
  const next = (row?.valor || 0) + 1;
  await tx.query(
    `INSERT INTO consecutivos ("tenantId", tipo, valor) VALUES ($1, $2, $3) ON CONFLICT ("tenantId", tipo) DO UPDATE SET valor = $3`,
    [tx.tenantId, key, next]
  );
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

async function pushAuditTx(tx, actor, accion, detalle) {
  await tx.query(
    `INSERT INTO auditLog (id, fecha, usuario, rol, accion, detalle, "tenantId") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [nid("aud"), todayISO(), actor?.usuario || "API", actor?.rol || "-", accion, detalle, tx.tenantId]
  );
}

// Partida doble: cada comprobante contable debe tener sus lineas
// cuadradas (suma debitos = suma creditos). "balanceado" queda guardado
// como columna aparte para poder filtrar comprobantes descuadrados sin
// tener que reprocesar el JSON de lineas cada vez.
async function crearComprobanteSQLTx(tx, { tipo, fecha, origen, lineas, glosa }) {
  const totalDebito = lineas.reduce((s, l) => s + (l.debito || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (l.credito || 0), 0);
  const numero = await nextConsecutivoTx(tx, "comprobante", "CC");
  const id = nid("cmp");
  await tx.query(
    `INSERT INTO comprobantes (id,numero,tipo,fecha,origen,glosa,lineas,totalDebito,totalCredito,balanceado,"tenantId")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, numero, tipo, fecha, origen ? JSON.stringify(origen) : null, glosa, JSON.stringify(lineas),
     totalDebito, totalCredito, Math.abs(totalDebito - totalCredito) < 1 ? 1 : 0, tx.tenantId]
  );
  return { id, numero };
}

// Costeo promedio ponderado: cada entrada con costoUnitario recalcula el
// costoPromedio del producto sobre el stock TOTAL (todas las bodegas), no
// solo la bodega que recibe - es la misma logica contable que ya tenia la
// version SQLite, solo traducida a consultas async de Postgres.
async function moverInventarioSQLTx(tx, { productoId, bodegaId, cantidad, tipo, origen, fecha, costoUnitario }) {
  const prod = await tx.queryOne("SELECT * FROM productos WHERE id = $1", [productoId]);
  if (!prod) return;

  if (tipo === "entrada") {
    if (costoUnitario != null && costoUnitario >= 0) {
      const stocks = await tx.queryOne("SELECT SUM(cantidad) as total FROM productoStock WHERE productoId = $1", [productoId]);
      const totalAntes = Number(stocks?.total) || 0;
      const valorAntes = totalAntes * (prod.costoPromedio || 0);
      const valorEntrada = cantidad * costoUnitario;
      const nuevoTotal = totalAntes + cantidad;
      const nuevoCosto = nuevoTotal > 0 ? (valorAntes + valorEntrada) / nuevoTotal : costoUnitario;
      await tx.query("UPDATE productos SET costoPromedio = $1 WHERE id = $2", [nuevoCosto, productoId]);
    }
    await tx.query(
      `INSERT INTO productoStock ("tenantId", productoId, bodegaId, cantidad) VALUES ($1,$2,$3,$4)
       ON CONFLICT ("tenantId",productoId,bodegaId) DO UPDATE SET cantidad = productoStock.cantidad + $4`,
      [tx.tenantId, productoId, bodegaId, cantidad]
    );
  } else {
    await tx.query(
      `INSERT INTO productoStock ("tenantId", productoId, bodegaId, cantidad) VALUES ($1,$2,$3,0)
       ON CONFLICT ("tenantId",productoId,bodegaId) DO UPDATE SET cantidad = GREATEST(0, productoStock.cantidad - $4)`,
      [tx.tenantId, productoId, bodegaId, cantidad]
    );
  }
  const stockFinal = await tx.queryOne("SELECT cantidad FROM productoStock WHERE productoId = $1 AND bodegaId = $2", [productoId, bodegaId]);
  const saldo = stockFinal?.cantidad || 0;
  await tx.query(
    `INSERT INTO movimientosInventario (id, productoId, bodegaId, cantidad, tipo, origen, fecha, saldoResultante, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [nid("mov"), productoId, bodegaId, cantidad, tipo, origen, fecha, saldo, tx.tenantId]
  );
}

const fmtCOP = (n) => n?.toLocaleString?.("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }) || `$${n}`;

/* ====== TERCEROS / PRODUCTOS (accion, con actor y respuesta {error}) ====== */

export async function crearTercero(actor, data) {
  return await db.transaction(async (tx) => {
    const existe = await tx.queryOne("SELECT id FROM terceros WHERE numDoc = $1", [data.numDoc]);
    if (existe) return { error: `Ya existe un tercero con el documento ${data.numDoc}.` };
    const t = { id: nid(data.tipo === "proveedor" ? "p" : "t"), saldoCartera: 0, saldoCxP: 0, creadoEn: todayISO(), ...data };
    await tx.query(
      `INSERT INTO terceros (id,tipo,tipoDoc,numDoc,nombre,email,telefono,ciudad,cupoCredito,condicionPagoDias,listaPrecios,saldoCartera,saldoCxP,creadoEn,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [t.id, t.tipo, t.tipoDoc, t.numDoc, t.nombre, t.email, t.telefono, t.ciudad,
       t.cupoCredito || 0, t.condicionPagoDias || 0, t.listaPrecios || "", t.saldoCartera || 0, t.saldoCxP || 0, t.creadoEn, tx.tenantId]
    );
    await pushAuditTx(tx, actor, "Crear tercero", `${t.nombre} (${t.tipo})`);
    return t;
  }, actor?.tenantId);
}

export async function crearProducto(actor, data) {
  return await db.transaction(async (tx) => {
    const existe = await tx.queryOne("SELECT id FROM productos WHERE codigo = $1", [data.codigo]);
    if (existe) return { error: `Ya existe un producto con el codigo ${data.codigo}.` };
    const p = { id: nid("prod"), ...data };
    await tx.query(
      `INSERT INTO productos (id,codigo,nombre,categoria,unidad,precio,costoPromedio,iva,tieneLote,minimo,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [p.id, p.codigo, p.nombre, p.categoria, p.unidad, p.precio || 0, p.costoPromedio || 0, p.iva ?? 19, p.tieneLote ? 1 : 0, p.minimo || 0, tx.tenantId]
    );
    await pushAuditTx(tx, actor, "Crear producto", `${p.codigo} - ${p.nombre}`);
    return p;
  }, actor?.tenantId);
}

/* ====== VENTAS ====== */

export async function crearCotizacion(actor, { terceroId, sedeId, items, vendedor }) {
  return await db.transaction(async (tx) => {
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "cotizacion", "COT");
    const id = nid("cot");
    const itemsEnq = [];
    for (const i of items) {
      const prod = await tx.queryOne("SELECT nombre, codigo FROM productos WHERE id = $1", [i.productoId]);
      itemsEnq.push({ ...i, nombre: prod?.nombre, codigo: prod?.codigo });
    }
    const subtotal = itemsEnq.reduce((s, i) => s + i.cantidad * i.precio, 0);
    const iva = itemsEnq.reduce((s, i) => s + i.cantidad * i.precio * ((i.ivaPct ?? 19) / 100), 0);
    const total = subtotal + iva;
    await tx.query(
      `INSERT INTO cotizaciones (id,numero,terceroId,sedeId,vendedor,fecha,subtotal,iva,total,estado,items,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, numero, terceroId, sedeId, vendedor || "Usuario demo", fecha, subtotal, iva, total, "borrador", JSON.stringify(itemsEnq), tx.tenantId]
    );
    await pushAuditTx(tx, actor, "Crear cotizacion", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, terceroId, sedeId, fecha, items: itemsEnq, subtotal, iva, total, estado: "borrador" };
  }, actor?.tenantId);
}

export async function aprobarCotizacion(actor, { id: cotizacionId }) {
  return await db.transaction(async (tx) => {
    const cot = await tx.queryOne("SELECT * FROM cotizaciones WHERE id = $1", [cotizacionId]);
    if (!cot || cot.estado !== "borrador") return { error: "Solo se pueden aprobar cotizaciones en borrador." };
    await tx.query("UPDATE cotizaciones SET estado = 'aprobada' WHERE id = $1", [cotizacionId]);
    await pushAuditTx(tx, actor, "Aprobar cotizacion", cot.numero);
    return { ...cot, estado: "aprobada" };
  }, actor?.tenantId);
}

export async function convertirPedido(actor, { id: cotizacionId }) {
  return await db.transaction(async (tx) => {
    const cot = await tx.queryOne("SELECT * FROM cotizaciones WHERE id = $1", [cotizacionId]);
    if (!cot || cot.estado !== "aprobada") return { error: "La cotizacion debe estar aprobada antes de convertirla en pedido." };
    const numero = await nextConsecutivoTx(tx, "pedido", "PED");
    const id = nid("ped");
    const fecha = todayISO();
    const items = db.parseCol(cot.items) || [];
    const subtotal = cot.subtotal, iva = cot.iva, total = cot.total;
    await tx.query(
      `INSERT INTO pedidos (id,numero,cotizacionId,terceroId,sedeId,fecha,subtotal,iva,total,estado,items,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, numero, cotizacionId, cot.terceroId, cot.sedeId, fecha, subtotal, iva, total, "pendiente", JSON.stringify(items), tx.tenantId]
    );
    await tx.query("UPDATE cotizaciones SET estado = 'convertida' WHERE id = $1", [cotizacionId]);
    await pushAuditTx(tx, actor, "Convertir cotizacion a pedido", `${cot.numero} -> ${numero}`);
    return { id, numero, cotizacionId, terceroId: cot.terceroId, sedeId: cot.sedeId, fecha, items, subtotal, iva, total, estado: "pendiente" };
  }, actor?.tenantId);
}

export async function generarRemision(actor, { pedidoId, bodegaId }) {
  return await db.transaction(async (tx) => {
    const ped = await tx.queryOne("SELECT * FROM pedidos WHERE id = $1", [pedidoId]);
    if (!ped || ped.estado === "remisionado") return { error: "El pedido no existe o ya fue remisionado." };
    const items = db.parseCol(ped.items) || [];
    for (const it of items) {
      const stock = await tx.queryOne("SELECT cantidad FROM productoStock WHERE productoId = $1 AND bodegaId = $2", [it.productoId, bodegaId]);
      const disponible = stock?.cantidad || 0;
      const prod = await tx.queryOne("SELECT nombre, categoria FROM productos WHERE id = $1", [it.productoId]);
      if (prod && (prod.categoria || "") !== "Servicios" && disponible < it.cantidad) {
        return { error: `Stock insuficiente de "${prod.nombre}" en la bodega seleccionada (disponible ${disponible}, requerido ${it.cantidad}).` };
      }
    }
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "remision", "REM");
    const id = nid("rem");
    await tx.query(
      `INSERT INTO remisiones (id,numero,pedidoId,terceroId,bodegaId,fecha,items,estado,"tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, numero, pedidoId, ped.terceroId, bodegaId, fecha, JSON.stringify(items), "entregada", tx.tenantId]
    );
    await tx.query("UPDATE pedidos SET estado = 'remisionado' WHERE id = $1", [pedidoId]);
    for (const it of items) {
      const prod = await tx.queryOne("SELECT categoria FROM productos WHERE id = $1", [it.productoId]);
      if (prod && prod.categoria !== "Servicios") {
        await moverInventarioSQLTx(tx, { productoId: it.productoId, bodegaId, cantidad: it.cantidad, tipo: "salida", origen: `Remision ${numero}`, fecha });
      }
    }
    await pushAuditTx(tx, actor, "Generar remision", `${numero} de pedido ${ped.numero}`);
    return { id, numero, pedidoId, terceroId: ped.terceroId, bodegaId, fecha, items, estado: "entregada" };
  }, actor?.tenantId);
}

export async function generarFactura(actor, { remisionId }) {
  return await db.transaction(async (tx) => {
    const rem = await tx.queryOne("SELECT * FROM remisiones WHERE id = $1", [remisionId]);
    if (!rem) return { error: "Remision no encontrada." };
    const ya = await tx.queryOne("SELECT id FROM facturas WHERE remisionId = $1", [remisionId]);
    if (ya) return { error: "Esta remision ya tiene una factura asociada." };
    const ped = await tx.queryOne("SELECT * FROM pedidos WHERE id = $1", [rem.pedidoId]);
    const tercero = await tx.queryOne("SELECT * FROM terceros WHERE id = $1", [rem.terceroId]);
    const items = db.parseCol(ped.items) || [];
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "factura", "FV");
    const id = nid("fac");
    const vencimiento = addDays(fecha, tercero.condicionPagoDias || 0).slice(0, 10);
    await tx.query(
      `INSERT INTO facturas (id,numero,remisionId,pedidoId,terceroId,sedeId,fecha,vencimiento,subtotal,iva,total,saldo,estado,estadoDian,items,pagos,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [id, numero, remisionId, ped.id, rem.terceroId, ped.sedeId, fecha, vencimiento,
       ped.subtotal, ped.iva, ped.total, ped.total, "pendiente", "borrador", JSON.stringify(items), "[]", tx.tenantId]
    );
    await tx.query("UPDATE terceros SET saldoCartera = saldoCartera + $1 WHERE id = $2", [ped.total, rem.terceroId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Factura de venta", fecha, origen: { tipo: "factura", id, numero },
      glosa: `Venta segun factura ${numero} a ${tercero.nombre}`,
      lineas: [
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero.nombre, debito: ped.total, credito: 0 },
        { cuenta: "4135", nombre: "Ingresos por venta de mercancia", tercero: tercero.nombre, debito: 0, credito: ped.subtotal },
        { cuenta: "2408", nombre: "IVA por pagar (generado)", tercero: tercero.nombre, debito: 0, credito: ped.iva },
      ],
    });
    let costoTotal = 0;
    for (const it of items) {
      const p = await tx.queryOne("SELECT costoPromedio, categoria FROM productos WHERE id = $1", [it.productoId]);
      if (p && p.categoria !== "Servicios") costoTotal += it.cantidad * (p.costoPromedio || 0);
    }
    if (costoTotal > 0) {
      await crearComprobanteSQLTx(tx, {
        tipo: "Costo de venta", fecha, origen: { tipo: "factura", id, numero },
        glosa: `Costo de venta asociado a factura ${numero}`,
        lineas: [
          { cuenta: "6135", nombre: "Costo de venta de mercancia", tercero: tercero.nombre, debito: costoTotal, credito: 0 },
          { cuenta: "1435", nombre: "Inventario de mercancias", tercero: tercero.nombre, debito: 0, credito: costoTotal },
        ],
      });
    }
    await pushAuditTx(tx, actor, "Emitir factura de venta", `${numero} por ${fmtCOP(ped.total)}`);
    return { id, numero, remisionId, pedidoId: ped.id, terceroId: rem.terceroId, sedeId: ped.sedeId, fecha, vencimiento,
      items, subtotal: ped.subtotal, iva: ped.iva, total: ped.total, saldo: ped.total, estado: "pendiente", estadoDian: "borrador", cufe: null, pagos: [] };
  }, actor?.tenantId);
}

export async function registrarRecibo(actor, { facturaId, monto, medioPago, cajaBancoId, fecha }) {
  return await db.transaction(async (tx) => {
    const fac = await tx.queryOne("SELECT * FROM facturas WHERE id = $1", [facturaId]);
    if (!fac || fac.estado === "anulada") return { error: "La factura no existe o esta anulada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (monto > fac.saldo + 0.5) return { error: `El monto (${fmtCOP(monto)}) supera el saldo pendiente (${fmtCOP(fac.saldo)}).` };
    const f = fecha || todayISO();
    const numero = await nextConsecutivoTx(tx, "reciboCaja", "RC");
    const recibo = { id: nid("rec"), numero, facturaId, monto, medioPago, cajaBancoId, fecha: f };
    const pagos = db.parseCol(fac.pagos) || [];
    pagos.push(recibo);
    const nuevoSaldo = Math.round((fac.saldo - monto) * 100) / 100;
    const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "parcial";
    await tx.query("UPDATE facturas SET saldo = $1, estado = $2, pagos = $3 WHERE id = $4", [nuevoSaldo, nuevoEstado, JSON.stringify(pagos), facturaId]);
    await tx.query("UPDATE terceros SET saldoCartera = GREATEST(0, saldoCartera - $1) WHERE id = $2", [monto, fac.terceroId]);
    const cb = await tx.queryOne("SELECT * FROM cajasBancos WHERE id = $1", [cajaBancoId]);
    if (cb) await tx.query("UPDATE cajasBancos SET saldo = saldo + $1 WHERE id = $2", [monto, cajaBancoId]);
    await tx.query(
      `INSERT INTO movimientosTesoreria (id, cajaBancoId, tipo, concepto, monto, fecha, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [nid("mvt"), cajaBancoId, "ingreso", `Recibo de caja ${numero} - Factura ${fac.numero}`, monto, f, tx.tenantId]
    );
    const tercero = await tx.queryOne("SELECT nombre FROM terceros WHERE id = $1", [fac.terceroId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Recibo de caja", fecha: f, origen: { tipo: "recibo", id: recibo.id, numero },
      glosa: `Recaudo de factura ${fac.numero} - ${tercero?.nombre || ""}`,
      lineas: [
        { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: tercero?.nombre || "", debito: monto, credito: 0 },
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero?.nombre || "", debito: 0, credito: monto },
      ],
    });
    await pushAuditTx(tx, actor, "Registrar recibo de caja", `${numero} por ${fmtCOP(monto)} sobre ${fac.numero}`);
    return recibo;
  }, actor?.tenantId);
}

export async function anularFactura(actor, { id: facturaId, motivo }) {
  return await db.transaction(async (tx) => {
    const fac = await tx.queryOne("SELECT * FROM facturas WHERE id = $1", [facturaId]);
    if (!fac) return { error: "Factura no encontrada." };
    const pagos = db.parseCol(fac.pagos) || [];
    if (pagos.length > 0) return { error: "No se puede anular una factura con recaudos aplicados. Reverse primero los recibos asociados." };
    if (!motivo || motivo.trim().length < 5) return { error: "Debe indicar un motivo de anulacion (minimo 5 caracteres)." };
    await tx.query("UPDATE facturas SET estado = 'anulada', estadoDian = 'anulado', motivoAnulacion = $1 WHERE id = $2", [motivo, facturaId]);
    await tx.query("UPDATE terceros SET saldoCartera = GREATEST(0, saldoCartera - $1) WHERE id = $2", [fac.saldo, fac.terceroId]);
    const tercero = await tx.queryOne("SELECT nombre FROM terceros WHERE id = $1", [fac.terceroId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Anulacion factura", fecha: todayISO(), origen: { tipo: "factura", id: fac.id, numero: fac.numero },
      glosa: `Anulacion de factura ${fac.numero}. Motivo: ${motivo}`,
      lineas: [
        { cuenta: "4135", nombre: "Ingresos por venta de mercancia", tercero: tercero?.nombre || "", debito: fac.subtotal, credito: 0 },
        { cuenta: "2408", nombre: "IVA por pagar (generado)", tercero: tercero?.nombre || "", debito: fac.iva, credito: 0 },
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero?.nombre || "", debito: 0, credito: fac.total },
      ],
    });
    await pushAuditTx(tx, actor, "Anular factura", `${fac.numero}. Motivo: ${motivo}`);
    return fac;
  }, actor?.tenantId);
}

/* ====== COMPRAS ====== */

export async function crearOrdenCompra(actor, { proveedorId, sedeId, bodegaId, items }) {
  return await db.transaction(async (tx) => {
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "ordenCompra", "OC");
    const id = nid("oc");
    const itemsEnq = [];
    for (const i of items) {
      const prod = await tx.queryOne("SELECT nombre, codigo FROM productos WHERE id = $1", [i.productoId]);
      itemsEnq.push({ ...i, nombre: prod?.nombre, codigo: prod?.codigo });
    }
    const total = itemsEnq.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
    await tx.query(
      `INSERT INTO ordenesCompra (id,numero,proveedorId,sedeId,bodegaId,fecha,total,estado,recibidoItems,items,"tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, numero, proveedorId, sedeId, bodegaId, fecha, total, "pendiente", "{}", JSON.stringify(itemsEnq), tx.tenantId]
    );
    await pushAuditTx(tx, actor, "Crear orden de compra", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, proveedorId, sedeId, bodegaId, fecha, items: itemsEnq, total, estado: "pendiente", recibidoItems: {} };
  }, actor?.tenantId);
}

export async function recibirOrdenCompra(actor, { ocId, items: itemsRecibidos }) {
  return await db.transaction(async (tx) => {
    const oc = await tx.queryOne("SELECT * FROM ordenesCompra WHERE id = $1", [ocId]);
    if (!oc) return { error: "Orden de compra no encontrada." };
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "recepcion", "REC");
    const recibidoItems = db.parseCol(oc.recibidoItems) || {};
    const itemsOC = db.parseCol(oc.items) || [];
    for (const it of itemsRecibidos) {
      const itemOC = itemsOC.find((x) => x.productoId === it.productoId);
      await moverInventarioSQLTx(tx, { productoId: it.productoId, bodegaId: oc.bodegaId, cantidad: it.cantidad, tipo: "entrada", origen: `Recepcion ${numero} (OC ${oc.numero})`, fecha, costoUnitario: itemOC?.costoUnitario });
      recibidoItems[it.productoId] = (recibidoItems[it.productoId] || 0) + it.cantidad;
    }
    const totalPedido = itemsOC.reduce((s, i) => s + i.cantidad, 0);
    const totalRecibido = Object.values(recibidoItems).reduce((s, v) => s + v, 0);
    const nuevoEstado = totalRecibido >= totalPedido ? "recibida" : "recibida_parcial";
    await tx.query("UPDATE ordenesCompra SET estado = $1, recibidoItems = $2 WHERE id = $3", [nuevoEstado, JSON.stringify(recibidoItems), ocId]);
    const itemsEnq = itemsRecibidos.map((it) => {
      const itemOC = itemsOC.find((x) => x.productoId === it.productoId);
      return { ...it, nombre: itemOC?.nombre, codigo: itemOC?.codigo };
    });
    const id = nid("rcp");
    await tx.query(`INSERT INTO recepciones (id,numero,ocId,fecha,items,"tenantId") VALUES ($1,$2,$3,$4,$5,$6)`, [id, numero, ocId, fecha, JSON.stringify(itemsEnq), tx.tenantId]);
    await pushAuditTx(tx, actor, "Recibir orden de compra", `${numero} sobre ${oc.numero}`);
    return { id, numero, ocId, items: itemsEnq, fecha };
  }, actor?.tenantId);
}

export async function generarFacturaCompra(actor, { recepcionId }) {
  return await db.transaction(async (tx) => {
    const rcp = await tx.queryOne("SELECT * FROM recepciones WHERE id = $1", [recepcionId]);
    if (!rcp) return { error: "Recepcion no encontrada." };
    const ya = await tx.queryOne("SELECT id FROM facturasCompra WHERE recepcionId = $1", [recepcionId]);
    if (ya) return { error: "Esta recepcion ya tiene una factura de compra asociada." };
    const oc = await tx.queryOne("SELECT * FROM ordenesCompra WHERE id = $1", [rcp.ocId]);
    const prov = await tx.queryOne("SELECT * FROM terceros WHERE id = $1", [oc.proveedorId]);
    const itemsRcp = db.parseCol(rcp.items) || [];
    const itemsOC = db.parseCol(oc.items) || [];
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, "facturaCompra", "FC");
    const id = nid("fc");
    const subtotal = itemsRcp.reduce((s, it) => { const itemOC = itemsOC.find((x) => x.productoId === it.productoId); return s + it.cantidad * (itemOC?.costoUnitario || 0); }, 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const vencimiento = addDays(fecha, prov.condicionPagoDias || 30).slice(0, 10);
    await tx.query(
      `INSERT INTO facturasCompra (id,numero,recepcionId,ocId,proveedorId,fecha,vencimiento,subtotal,iva,total,saldo,estado,items,"tenantId")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id, numero, recepcionId, oc.id, oc.proveedorId, fecha, vencimiento, subtotal, iva, total, total, "pendiente", JSON.stringify(itemsRcp), tx.tenantId]
    );
    await tx.query("UPDATE terceros SET saldoCxP = saldoCxP + $1 WHERE id = $2", [total, oc.proveedorId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Factura de compra", fecha, origen: { tipo: "facturaCompra", id, numero },
      glosa: `Compra segun factura proveedor ${numero} - ${prov.nombre}`,
      lineas: [
        { cuenta: "1435", nombre: "Inventario de mercancias", tercero: prov.nombre, debito: subtotal, credito: 0 },
        { cuenta: "2409", nombre: "IVA descontable (compras)", tercero: prov.nombre, debito: iva, credito: 0 },
        { cuenta: "2205", nombre: "Proveedores nacionales (CxP)", tercero: prov.nombre, debito: 0, credito: total },
      ],
    });
    await pushAuditTx(tx, actor, "Registrar factura de compra", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, recepcionId, ocId: oc.id, proveedorId: oc.proveedorId, fecha, vencimiento, items: itemsRcp, subtotal, iva, total, saldo: total, estado: "pendiente" };
  }, actor?.tenantId);
}

export async function pagarFacturaCompra(actor, { facturaCompraId, monto, cajaBancoId, fecha }) {
  return await db.transaction(async (tx) => {
    const fc = await tx.queryOne("SELECT * FROM facturasCompra WHERE id = $1", [facturaCompraId]);
    if (!fc) return { error: "Factura de compra no encontrada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (monto > fc.saldo + 0.5) return { error: `El monto supera el saldo pendiente (${fmtCOP(fc.saldo)}).` };
    const f = fecha || todayISO();
    const numero = await nextConsecutivoTx(tx, "egreso", "CE");
    const nuevoSaldo = Math.round((fc.saldo - monto) * 100) / 100;
    const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "parcial";
    await tx.query("UPDATE facturasCompra SET saldo = $1, estado = $2 WHERE id = $3", [nuevoSaldo, nuevoEstado, facturaCompraId]);
    await tx.query("UPDATE terceros SET saldoCxP = GREATEST(0, saldoCxP - $1) WHERE id = $2", [monto, fc.proveedorId]);
    const cb = await tx.queryOne("SELECT * FROM cajasBancos WHERE id = $1", [cajaBancoId]);
    if (cb) await tx.query("UPDATE cajasBancos SET saldo = saldo - $1 WHERE id = $2", [monto, cajaBancoId]);
    await tx.query(
      `INSERT INTO movimientosTesoreria (id, cajaBancoId, tipo, concepto, monto, fecha, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [nid("mvt"), cajaBancoId, "egreso", `Comprobante de egreso ${numero} - Factura compra ${fc.numero}`, monto, f, tx.tenantId]
    );
    const prov = await tx.queryOne("SELECT nombre FROM terceros WHERE id = $1", [fc.proveedorId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Comprobante de egreso", fecha: f, origen: { tipo: "egreso", id: numero, numero },
      glosa: `Pago factura de compra ${fc.numero} - ${prov?.nombre || ""}`,
      lineas: [
        { cuenta: "2205", nombre: "Proveedores nacionales (CxP)", tercero: prov?.nombre || "", debito: monto, credito: 0 },
        { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: prov?.nombre || "", debito: 0, credito: monto },
      ],
    });
    await pushAuditTx(tx, actor, "Pagar factura de compra", `${numero} por ${fmtCOP(monto)}`);
    return { numero, monto };
  }, actor?.tenantId);
}

/* ====== INVENTARIO / TESORERIA / CONTABILIDAD ====== */

export async function ajusteInventario(actor, { productoId, bodegaId, cantidad, tipo, motivo }) {
  return await db.transaction(async (tx) => {
    const stock = await tx.queryOne("SELECT cantidad FROM productoStock WHERE productoId = $1 AND bodegaId = $2", [productoId, bodegaId]);
    if (tipo === "salida" && (stock?.cantidad || 0) < cantidad) return { error: "El ajuste de salida supera el stock disponible." };
    await moverInventarioSQLTx(tx, { productoId, bodegaId, cantidad: Math.abs(cantidad), tipo, origen: `Ajuste manual (${motivo})`, fecha: todayISO() });
    const prod = await tx.queryOne("SELECT nombre FROM productos WHERE id = $1", [productoId]);
    await pushAuditTx(tx, actor, "Ajuste de inventario", `${tipo} de ${cantidad} und. de ${prod?.nombre}. Motivo: ${motivo}`);
    return { ok: true };
  }, actor?.tenantId);
}

export async function transferenciaInventario(actor, { productoId, origenBodegaId, destinoBodegaId, cantidad }) {
  return await db.transaction(async (tx) => {
    if (origenBodegaId === destinoBodegaId) return { error: "La bodega de origen y destino deben ser diferentes." };
    const stock = await tx.queryOne("SELECT cantidad FROM productoStock WHERE productoId = $1 AND bodegaId = $2", [productoId, origenBodegaId]);
    if ((stock?.cantidad || 0) < cantidad) return { error: "Stock insuficiente en la bodega de origen." };
    const fecha = todayISO();
    await moverInventarioSQLTx(tx, { productoId, bodegaId: origenBodegaId, cantidad, tipo: "salida", origen: `Transferencia a ${destinoBodegaId}`, fecha });
    await moverInventarioSQLTx(tx, { productoId, bodegaId: destinoBodegaId, cantidad, tipo: "entrada", origen: `Transferencia desde ${origenBodegaId}`, fecha });
    const prod = await tx.queryOne("SELECT nombre FROM productos WHERE id = $1", [productoId]);
    await pushAuditTx(tx, actor, "Transferencia de inventario", `${cantidad} und. de ${prod?.nombre}`);
    return { ok: true };
  }, actor?.tenantId);
}

export async function registrarMovimientoTesoreriaManual(actor, { cajaBancoId, tipo, concepto, monto, cuentaContrapartida }) {
  return await db.transaction(async (tx) => {
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    const cb = await tx.queryOne("SELECT * FROM cajasBancos WHERE id = $1", [cajaBancoId]);
    if (!cb) return { error: "Caja o banco no encontrado." };
    if (tipo === "egreso" && cb.saldo < monto) return { error: "Saldo insuficiente en la caja/banco seleccionado." };
    const fecha = todayISO();
    const numero = await nextConsecutivoTx(tx, tipo === "ingreso" ? "reciboCaja" : "egreso", tipo === "ingreso" ? "RC" : "CE");
    await tx.query("UPDATE cajasBancos SET saldo = saldo + $1 WHERE id = $2", [tipo === "ingreso" ? monto : -monto, cajaBancoId]);
    await tx.query(
      `INSERT INTO movimientosTesoreria (id, cajaBancoId, tipo, concepto, monto, fecha, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [nid("mvt"), cajaBancoId, tipo, `${numero} — ${concepto}`, monto, fecha, tx.tenantId]
    );
    const cuentaCaja = cb.tipo === "caja" ? "1105" : "1110";
    const c = await tx.queryOne("SELECT nombre FROM planCuentas WHERE codigo = $1", [cuentaContrapartida]);
    const lineas = tipo === "ingreso"
      ? [{ cuenta: cuentaCaja, nombre: cuentaCaja === "1105" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: monto, credito: 0 }, { cuenta: cuentaContrapartida, nombre: c?.nombre || cuentaContrapartida, tercero: "-", debito: 0, credito: monto }]
      : [{ cuenta: cuentaContrapartida, nombre: c?.nombre || cuentaContrapartida, tercero: "-", debito: monto, credito: 0 }, { cuenta: cuentaCaja, nombre: cuentaCaja === "1105" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: 0, credito: monto }];
    await crearComprobanteSQLTx(tx, { tipo: tipo === "ingreso" ? "Recibo de caja" : "Comprobante de egreso", fecha, origen: { tipo: "manual" }, glosa: concepto, lineas });
    await pushAuditTx(tx, actor, tipo === "ingreso" ? "Registrar ingreso de tesoreria" : "Registrar egreso de tesoreria", `${numero} por ${fmtCOP(monto)} — ${concepto}`);
    return { numero };
  }, actor?.tenantId);
}

export async function transferenciaTesoreria(actor, { origenId, destinoId, monto }) {
  return await db.transaction(async (tx) => {
    if (origenId === destinoId) return { error: "Selecciona cuentas de origen y destino diferentes." };
    const origen = await tx.queryOne("SELECT * FROM cajasBancos WHERE id = $1", [origenId]);
    const destino = await tx.queryOne("SELECT * FROM cajasBancos WHERE id = $1", [destinoId]);
    if (!origen || !destino) return { error: "Cuenta no encontrada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (origen.saldo < monto) return { error: "Saldo insuficiente en la cuenta de origen." };
    const fecha = todayISO();
    await tx.query("UPDATE cajasBancos SET saldo = saldo - $1 WHERE id = $2", [monto, origenId]);
    await tx.query("UPDATE cajasBancos SET saldo = saldo + $1 WHERE id = $2", [monto, destinoId]);
    await tx.query(`INSERT INTO movimientosTesoreria (id, cajaBancoId, tipo, concepto, monto, fecha, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7)`, [nid("mvt"), origenId, "egreso", `Transferencia a ${destino.nombre}`, monto, fecha, tx.tenantId]);
    await tx.query(`INSERT INTO movimientosTesoreria (id, cajaBancoId, tipo, concepto, monto, fecha, "tenantId") VALUES ($1,$2,$3,$4,$5,$6,$7)`, [nid("mvt"), destinoId, "ingreso", `Transferencia desde ${origen.nombre}`, monto, fecha, tx.tenantId]);
    await crearComprobanteSQLTx(tx, {
      tipo: "Transferencia entre cuentas", fecha, origen: { tipo: "transferencia" }, glosa: `Transferencia de ${origen.nombre} a ${destino.nombre}`,
      lineas: [{ cuenta: destino.tipo === "caja" ? "1105" : "1110", nombre: destino.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: monto, credito: 0 }, { cuenta: origen.tipo === "caja" ? "1105" : "1110", nombre: origen.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: 0, credito: monto }],
    });
    await pushAuditTx(tx, actor, "Transferencia entre cuentas", `${fmtCOP(monto)} de ${origen.nombre} a ${destino.nombre}`);
    return { ok: true };
  }, actor?.tenantId);
}

export async function crearComprobanteManual(actor, { tipo, fecha, glosa, lineas }) {
  return await db.transaction(async (tx) => {
    const totalDebito = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
    const totalCredito = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
    if (Math.abs(totalDebito - totalCredito) > 0.5) return { error: `El comprobante no cuadra: debitos ${fmtCOP(totalDebito)} vs creditos ${fmtCOP(totalCredito)}.` };
    if (lineas.length < 2) return { error: "Un comprobante requiere al menos dos lineas (partida doble)." };
    const comp = await crearComprobanteSQLTx(tx, { tipo, fecha, origen: { tipo: "manual" }, glosa, lineas });
    await pushAuditTx(tx, actor, "Registrar comprobante manual", `${comp.numero} - ${glosa}`);
    return comp;
  }, actor?.tenantId);
}

export async function liquidarNomina(actor, { periodo, empleadoIds }) {
  return await db.transaction(async (tx) => {
    const SM = 1300000;
    const placeholders = empleadoIds.map((_, i) => `$${i + 1}`).join(",");
    const empleados = await tx.query(`SELECT * FROM empleados WHERE id IN (${placeholders})`, empleadoIds);
    if (empleados.length === 0) return { error: "Selecciona al menos un empleado." };
    const ya = await tx.queryOne("SELECT id FROM nominas WHERE periodo = $1", [periodo]);
    if (ya) return { error: `El periodo ${periodo} ya fue liquidado.` };
    const fecha = todayISO();
    const nominasGen = [];
    for (const emp of empleados) {
      const s = emp.salario;
      const aux = s <= 2 * SM ? 200000 : 0;
      const sEmp = Math.round(s * 0.04), pEmp = Math.round(s * 0.04), fsp = s > 4 * SM ? Math.round(s * 0.01) : 0;
      const ded = sEmp + pEmp + fsp;
      const neto = s + aux - ded;
      const sPat = Math.round(s * 0.085), pPat = Math.round(s * 0.12), arl = Math.round(s * 0.00522);
      const sena = Math.round(s * 0.02), icbf = Math.round(s * 0.03), ccf = Math.round(s * 0.04);
      const aportes = sPat + pPat + arl + sena + icbf + ccf;
      const ces = Math.round(s * 0.0833), prima = Math.round(s * 0.0833), vac = Math.round(s * 0.0417), intC = Math.round(ces * 0.12);
      const prest = ces + prima + vac + intC;
      const id = nid("nom");
      await tx.query(
        `INSERT INTO nominas (id,periodo,fecha,empleadoId,empleadoNombre,cargo,salarioBase,auxTransporte,deducciones,deduccionesTotal,netoPagar,aportesPatronales,aportesPatronalesTotal,prestaciones,prestacionesTotal,costoTotalEmpresa,"tenantId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [id, periodo, fecha, emp.id, emp.nombre, emp.cargo, s, aux,
         JSON.stringify({ salud: sEmp, pension: pEmp, fsp }), ded, neto,
         JSON.stringify({ salud: sPat, pension: pPat, arl, sena, icbf, ccf }), aportes,
         JSON.stringify({ cesantias: ces, prima, vacaciones: vac, intCesantias: intC }), prest, s + aux + aportes + prest, tx.tenantId]
      );
      nominasGen.push({ id, periodo, fecha, empleadoId: emp.id, empleadoNombre: emp.nombre, cargo: emp.cargo, salarioBase: s, auxTransporte: aux,
        deducciones: { salud: sEmp, pension: pEmp, fsp }, deduccionesTotal: ded, netoPagar: neto,
        aportesPatronales: { salud: sPat, pension: pPat, arl, sena, icbf, ccf }, aportesPatronalesTotal: aportes,
        prestaciones: { cesantias: ces, prima, vacaciones: vac, intCesantias: intC }, prestacionesTotal: prest, costoTotalEmpresa: s + aux + aportes + prest });
      await crearComprobanteSQLTx(tx, {
        tipo: "Nomina", fecha, origen: { tipo: "nomina", id, periodo },
        glosa: `Nomina ${periodo} — ${emp.nombre} (${emp.cargo})`,
        lineas: [
          { cuenta: "5105", nombre: "Gastos de personal", tercero: emp.nombre, debito: s + aux + aportes + prest, credito: 0 },
          { cuenta: "1110", nombre: "Bancos - Cta corriente", tercero: emp.nombre, debito: 0, credito: neto },
          { cuenta: "2505", nombre: "Salarios y prestaciones por pagar", tercero: emp.nombre, debito: 0, credito: ded + aportes + prest },
        ],
      });
      await tx.query(
        `UPDATE cajasBancos SET saldo = saldo - $1
         WHERE id = (SELECT id FROM cajasBancos WHERE tipo = 'banco' LIMIT 1)`,
        [neto]
      );
    }
    await pushAuditTx(tx, actor, "Liquidar nomina", `Periodo ${periodo} — ${nominasGen.length} empleado(s)`);
    return { nominas: nominasGen };
  }, actor?.tenantId);
}

export async function simularRespuestaDian(actor, { id: facturaId }) {
  return await db.transaction(async (tx) => {
    const fac = await tx.queryOne("SELECT * FROM facturas WHERE id = $1", [facturaId]);
    if (!fac) return { error: "Factura no encontrada." };
    const r = Math.random();
    const estadoDian = r < 0.85 ? "aceptado" : r < 0.95 ? "contingencia" : "rechazado";
    const cufe = estadoDian === "aceptado" ? `CUFE-SIM-${Math.random().toString(36).slice(2, 18)}` : null;
    await tx.query("UPDATE facturas SET estadoDian = $1, cufe = $2 WHERE id = $3", [estadoDian, cufe, facturaId]);
    await pushAuditTx(tx, actor, "Simular respuesta DIAN (sandbox)", `${fac.numero}: ${estadoDian}`);
    return { estadoDian, cufe };
  }, actor?.tenantId);
}

/* ---------- Exportar todas las funciones ---------- */
export default {
  getConsecutivo,
  updateConsecutivo,
  getAuditLog,
  createProducto,
  getProductos,
  getProducto,
  updateProducto,
  createTercero,
  getTerceros,
  getTercero,
  updateTercero,
  createFactura,
  getFacturas,
  getFactura,
  updateFacturaEstado,
  getStock,
  updateStock,
  getEmpresa,
  updateEmpresa,
  getUsuarios,
  getUsuario,
  createUsuario,
  updateUsuario,
  getDashboardData,
  getBodegas,
  createBodega,
  getSedes,
  createSede,
  // Acciones reales de negocio (dispatcher /api/accion en index.js)
  crearTercero,
  crearProducto,
  crearCotizacion,
  aprobarCotizacion,
  convertirPedido,
  generarRemision,
  generarFactura,
  registrarRecibo,
  anularFactura,
  crearOrdenCompra,
  recibirOrdenCompra,
  generarFacturaCompra,
  pagarFacturaCompra,
  ajusteInventario,
  transferenciaInventario,
  registrarMovimientoTesoreriaManual,
  transferenciaTesoreria,
  crearComprobanteManual,
  liquidarNomina,
  simularRespuestaDian
};
