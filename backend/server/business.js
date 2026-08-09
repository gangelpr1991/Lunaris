import db from "./db.js";

let __idSeq = 10000;
const nid = (p) => `${p}-${(__idSeq++).toString(36)}`;
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
     data.tieneLote || false, data.minimo || 0]
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
    `INSERT INTO usuarios (id, usuario, nombre, email, rol, passwordHash, activo) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, data.usuario, data.nombre, data.email, data.rol || 'usuario', data.passwordHash, data.activo !== false]
  );
  return await getUsuario(id);
}

export async function updateUsuario(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id' && key !== 'passwordHash') {
      fields.push(`${key} = $${idx++}`);
      params.push(value);
    }
  }
  if (data.passwordHash) {
    fields.push(`passwordHash = $${idx++}`);
    params.push(data.passwordHash);
  }
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
    "INSERT INTO bodegas (id, nombre, direccion, encargado) VALUES ($1, $2, $3, $4)",
    [id, data.nombre, data.direccion, data.encargado]
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
    "INSERT INTO sedes (id, nombre, direccion, telefono) VALUES ($1, $2, $3, $4)",
    [id, data.nombre, data.direccion, data.telefono]
  );
  return await db.queryOne("SELECT * FROM sedes WHERE id = $1", [id]);
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
  createSede
};
