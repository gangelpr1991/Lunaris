import db from "./db.js";

let __idSeq = 10000;
const nid = (p) => `${p}-${(__idSeq++).toString(36)}`;
const todayISO = () => new Date().toISOString();
const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();

/* ---------- helpers SQL ---------- */

function nextConsecutivo(draftDB, key, prefix) {
  const row = db.prepare("SELECT valor FROM consecutivos WHERE tipo = ?").get(key);
  const next = (row?.valor || 0) + 1;
  db.prepare("INSERT INTO consecutivos (tipo, valor) VALUES (?, ?) ON CONFLICT(tipo) DO UPDATE SET valor = ?").run(key, next, next);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

function pushAudit(actor, accion, detalle) {
  db.prepare("INSERT INTO audit_log (id, fecha, usuario, rol, accion, detalle) VALUES (?,?,?,?,?,?)")
    .run(nid("aud"), todayISO(), actor?.usuario || "API", actor?.rol || "-", accion, detalle);
}

function crearComprobanteSQL({ tipo, fecha, origen, lineas, glosa }) {
  const totalDebito = lineas.reduce((s, l) => s + (l.debito || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (l.credito || 0), 0);
  const numero = nextConsecutivo(null, "comprobante", "CC");
  const id = nid("cmp");
  db.prepare("INSERT INTO comprobantes (id,numero,tipo,fecha,origen,glosa,lineas,totalDebito,totalCredito,balanceado) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(id, numero, tipo, fecha, origen ? JSON.stringify(origen) : null, glosa, JSON.stringify(lineas), totalDebito, totalCredito, Math.abs(totalDebito - totalCredito) < 1 ? 1 : 0);
  return { id, numero };
}

function moverInventarioSQL({ productoId, bodegaId, cantidad, tipo, origen, fecha, costoUnitario }) {
  const prod = db.prepare("SELECT * FROM productos WHERE id = ?").get(productoId);
  if (!prod) return;
  const stockRow = db.prepare("SELECT cantidad FROM producto_stock WHERE productoId = ? AND bodegaId = ?").get(productoId, bodegaId);
  const stockAntes = stockRow?.cantidad || 0;
  if (tipo === "entrada") {
    if (costoUnitario != null && costoUnitario >= 0) {
      const stocks = db.prepare("SELECT SUM(cantidad) as total FROM producto_stock WHERE productoId = ?").get(productoId);
      const totalAntes = stocks?.total || 0;
      const valorAntes = totalAntes * (prod.costoPromedio || 0);
      const valorEntrada = cantidad * costoUnitario;
      const nuevoTotal = totalAntes + cantidad;
      const nuevoCosto = nuevoTotal > 0 ? (valorAntes + valorEntrada) / nuevoTotal : costoUnitario;
      db.prepare("UPDATE productos SET costoPromedio = ? WHERE id = ?").run(nuevoCosto, productoId);
    }
    db.prepare("INSERT INTO producto_stock (productoId, bodegaId, cantidad) VALUES (?,?,?) ON CONFLICT(productoId,bodegaId) DO UPDATE SET cantidad = cantidad + ?")
      .run(productoId, bodegaId, cantidad, cantidad);
  } else {
    db.prepare("INSERT INTO producto_stock (productoId, bodegaId, cantidad) VALUES (?,?,0) ON CONFLICT(productoId,bodegaId) DO UPDATE SET cantidad = MAX(0, cantidad - ?)")
      .run(productoId, bodegaId, cantidad);
  }
  const saldo = (db.prepare("SELECT cantidad FROM producto_stock WHERE productoId = ? AND bodegaId = ?").get(productoId, bodegaId)?.cantidad) || 0;
  db.prepare("INSERT INTO movimientos_inventario (id, productoId, bodegaId, cantidad, tipo, origen, fecha, saldoResultante) VALUES (?,?,?,?,?,?,?,?)")
    .run(nid("mov"), productoId, bodegaId, cantidad, tipo, origen, fecha, saldo);
}

/* ====== TERCEROS / PRODUCTOS ====== */

export function crearTercero(actor, data) {
  const existe = db.prepare("SELECT id FROM terceros WHERE numDoc = ?").get(data.numDoc);
  if (existe) return { error: `Ya existe un tercero con el documento ${data.numDoc}.` };
  const t = { id: nid(data.tipo === "proveedor" ? "p" : "t"), saldoCartera: 0, saldoCxP: 0, creadoEn: todayISO(), ...data };
  db.prepare("INSERT INTO terceros (id,tipo,tipoDoc,numDoc,nombre,email,telefono,ciudad,cupoCredito,condicionPagoDias,listaPrecios,saldoCartera,saldoCxP,creadoEn) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(t.id, t.tipo, t.tipoDoc, t.numDoc, t.nombre, t.email, t.telefono, t.ciudad, t.cupoCredito || 0, t.condicionPagoDias || 0, t.listaPrecios || "", t.saldoCartera || 0, t.saldoCxP || 0, t.creadoEn);
  pushAudit(actor, "Crear tercero", `${t.nombre} (${t.tipo})`);
  return t;
}

export function crearProducto(actor, data) {
  const existe = db.prepare("SELECT id FROM productos WHERE codigo = ?").get(data.codigo);
  if (existe) return { error: `Ya existe un producto con el codigo ${data.codigo}.` };
  const p = { id: nid("prod"), ...data };
  db.prepare("INSERT INTO productos (id,codigo,nombre,categoria,unidad,precio,costoPromedio,iva,tieneLote,minimo) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .run(p.id, p.codigo, p.nombre, p.categoria, p.unidad, p.precio, p.costoPromedio, p.iva, p.tieneLote ? 1 : 0, p.minimo || 0);
  pushAudit(actor, "Crear producto", `${p.codigo} - ${p.nombre}`);
  return p;
}

/* ====== VENTAS ====== */

export function crearCotizacion(actor, { terceroId, sedeId, items, vendedor }) {
  const tx = db.transaction(() => {
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "cotizacion", "COT");
    const id = nid("cot");
    const itemsEnq = items.map((i) => {
      const prod = db.prepare("SELECT nombre, codigo FROM productos WHERE id = ?").get(i.productoId);
      return { ...i, nombre: prod?.nombre, codigo: prod?.codigo };
    });
    const subtotal = itemsEnq.reduce((s, i) => s + i.cantidad * i.precio, 0);
    const iva = itemsEnq.reduce((s, i) => s + i.cantidad * i.precio * ((i.ivaPct ?? 19) / 100), 0);
    const total = subtotal + iva;
    db.prepare("INSERT INTO cotizaciones (id,numero,terceroId,sedeId,vendedor,fecha,subtotal,iva,total,estado,items) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, numero, terceroId, sedeId, vendedor || "Usuario demo", fecha, subtotal, iva, total, "borrador", JSON.stringify(itemsEnq));
    pushAudit(actor, "Crear cotizacion", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, terceroId, sedeId, fecha, items: itemsEnq, subtotal, iva, total, estado: "borrador" };
  });
  return tx();
}

export function aprobarCotizacion(actor, cotizacionId) {
  const tx = db.transaction(() => {
    const cot = db.prepare("SELECT * FROM cotizaciones WHERE id = ?").get(cotizacionId);
    if (!cot || cot.estado !== "borrador") return { error: "Solo se pueden aprobar cotizaciones en borrador." };
    db.prepare("UPDATE cotizaciones SET estado = 'aprobada' WHERE id = ?").run(cotizacionId);
    pushAudit(actor, "Aprobar cotizacion", cot.numero);
    return { ...cot, estado: "aprobada" };
  });
  return tx();
}

export function convertirPedido(actor, cotizacionId) {
  const tx = db.transaction(() => {
    const cot = db.prepare("SELECT * FROM cotizaciones WHERE id = ?").get(cotizacionId);
    if (!cot || cot.estado !== "aprobada") return { error: "La cotizacion debe estar aprobada antes de convertirla en pedido." };
    const numero = nextConsecutivo(null, "pedido", "PED");
    const id = nid("ped");
    const fecha = todayISO();
    const items = JSON.parse(cot.items || "[]");
    const subtotal = cot.subtotal, iva = cot.iva, total = cot.total;
    db.prepare("INSERT INTO pedidos (id,numero,cotizacionId,terceroId,sedeId,fecha,subtotal,iva,total,estado,items) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, numero, cotizacionId, cot.terceroId, cot.sedeId, fecha, subtotal, iva, total, "pendiente", JSON.stringify(items));
    db.prepare("UPDATE cotizaciones SET estado = 'convertida' WHERE id = ?").run(cotizacionId);
    pushAudit(actor, "Convertir cotizacion a pedido", `${cot.numero} -> ${numero}`);
    return { id, numero, cotizacionId, terceroId: cot.terceroId, sedeId: cot.sedeId, fecha, items, subtotal, iva, total, estado: "pendiente" };
  });
  return tx();
}

export function generarRemision(actor, { pedidoId, bodegaId }) {
  const tx = db.transaction(() => {
    const ped = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedidoId);
    if (!ped || ped.estado === "remisionado") return { error: "El pedido no existe o ya fue remisionado." };
    const items = JSON.parse(ped.items || "[]");
    for (const it of items) {
      const stock = db.prepare("SELECT cantidad FROM producto_stock WHERE productoId = ? AND bodegaId = ?").get(it.productoId, bodegaId);
      const disponible = stock?.cantidad || 0;
      const prod = db.prepare("SELECT nombre FROM productos WHERE id = ?").get(it.productoId);
      if (prod && (prod.categoria || "") !== "Servicios" && disponible < it.cantidad) {
        return { error: `Stock insuficiente de "${prod.nombre}" en la bodega seleccionada (disponible ${disponible}, requerido ${it.cantidad}).` };
      }
    }
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "remision", "REM");
    const id = nid("rem");
    db.prepare("INSERT INTO remisiones (id,numero,pedidoId,terceroId,bodegaId,fecha,items,estado) VALUES (?,?,?,?,?,?,?,?)")
      .run(id, numero, pedidoId, ped.terceroId, bodegaId, fecha, JSON.stringify(items), "entregada");
    db.prepare("UPDATE pedidos SET estado = 'remisionado' WHERE id = ?").run(pedidoId);
    for (const it of items) {
      const prod = db.prepare("SELECT categoria FROM productos WHERE id = ?").get(it.productoId);
      if (prod && prod.categoria !== "Servicios") {
        moverInventarioSQL({ productoId: it.productoId, bodegaId, cantidad: it.cantidad, tipo: "salida", origen: `Remision ${numero}`, fecha });
      }
    }
    pushAudit(actor, "Generar remision", `${numero} de pedido ${ped.numero}`);
    return { id, numero, pedidoId, terceroId: ped.terceroId, bodegaId, fecha, items, estado: "entregada" };
  });
  return tx();
}

export function generarFactura(actor, { remisionId }) {
  const tx = db.transaction(() => {
    const rem = db.prepare("SELECT * FROM remisiones WHERE id = ?").get(remisionId);
    if (!rem) return { error: "Remision no encontrada." };
    const ya = db.prepare("SELECT id FROM facturas WHERE remisionId = ?").get(remisionId);
    if (ya) return { error: "Esta remision ya tiene una factura asociada." };
    const ped = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(rem.pedidoId);
    const tercero = db.prepare("SELECT * FROM terceros WHERE id = ?").get(rem.terceroId);
    const items = JSON.parse(ped.items || "[]");
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "factura", "FV");
    const id = nid("fac");
    const vencimiento = addDays(fecha, tercero.condicionPagoDias || 0).slice(0, 10);
    db.prepare("INSERT INTO facturas (id,numero,remisionId,pedidoId,terceroId,sedeId,fecha,vencimiento,subtotal,iva,total,saldo,estado,estadoDian,items,pagos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, numero, remisionId, ped.id, rem.terceroId, ped.sedeId, fecha, vencimiento, ped.subtotal, ped.iva, ped.total, ped.total, "pendiente", "borrador", JSON.stringify(items), "[]");
    db.prepare("UPDATE terceros SET saldoCartera = saldoCartera + ? WHERE id = ?").run(ped.total, rem.terceroId);
    crearComprobanteSQL({ tipo: "Factura de venta", fecha, origen: { tipo: "factura", id, numero },
      glosa: `Venta segun factura ${numero} a ${tercero.nombre}`,
      lineas: [
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero.nombre, debito: ped.total, credito: 0 },
        { cuenta: "4135", nombre: "Ingresos por venta de mercancia", tercero: tercero.nombre, debito: 0, credito: ped.subtotal },
        { cuenta: "2408", nombre: "IVA por pagar (generado)", tercero: tercero.nombre, debito: 0, credito: ped.iva },
      ],
    });
    let costoTotal = 0;
    for (const it of items) {
      const p = db.prepare("SELECT costoPromedio, categoria FROM productos WHERE id = ?").get(it.productoId);
      if (p && p.categoria !== "Servicios") costoTotal += it.cantidad * (p.costoPromedio || 0);
    }
    if (costoTotal > 0) {
      crearComprobanteSQL({ tipo: "Costo de venta", fecha, origen: { tipo: "factura", id, numero },
        glosa: `Costo de venta asociado a factura ${numero}`,
        lineas: [
          { cuenta: "6135", nombre: "Costo de venta de mercancia", tercero: tercero.nombre, debito: costoTotal, credito: 0 },
          { cuenta: "1435", nombre: "Inventario de mercancias", tercero: tercero.nombre, debito: 0, credito: costoTotal },
        ],
      });
    }
    pushAudit(actor, "Emitir factura de venta", `${numero} por ${fmtCOP(ped.total)}`);
    return { id, numero, remisionId, pedidoId: ped.id, terceroId: rem.terceroId, sedeId: ped.sedeId, fecha, vencimiento, items, subtotal: ped.subtotal, iva: ped.iva, total: ped.total, saldo: ped.total, estado: "pendiente", estadoDian: "borrador", cufe: null, pagos: [] };
  });
  return tx();
}

export function registrarRecibo(actor, { facturaId, monto, medioPago, cajaBancoId, fecha }) {
  const tx = db.transaction(() => {
    const fac = db.prepare("SELECT * FROM facturas WHERE id = ?").get(facturaId);
    if (!fac || fac.estado === "anulada") return { error: "La factura no existe o esta anulada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (monto > fac.saldo + 0.5) return { error: `El monto (${fmtCOP(monto)}) supera el saldo pendiente (${fmtCOP(fac.saldo)}).` };
    const f = fecha || todayISO();
    const numero = nextConsecutivo(null, "reciboCaja", "RC");
    const recibo = { id: nid("rec"), numero, facturaId, monto, medioPago, cajaBancoId, fecha: f };
    const pagos = JSON.parse(fac.pagos || "[]");
    pagos.push(recibo);
    const nuevoSaldo = Math.round((fac.saldo - monto) * 100) / 100;
    const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "parcial";
    db.prepare("UPDATE facturas SET saldo = ?, estado = ?, pagos = ? WHERE id = ?").run(nuevoSaldo, nuevoEstado, JSON.stringify(pagos), facturaId);
    db.prepare("UPDATE terceros SET saldoCartera = MAX(0, saldoCartera - ?) WHERE id = ?").run(monto, fac.terceroId);
    const cb = db.prepare("SELECT * FROM cajas_bancos WHERE id = ?").get(cajaBancoId);
    if (cb) db.prepare("UPDATE cajas_bancos SET saldo = saldo + ? WHERE id = ?").run(monto, cajaBancoId);
    db.prepare("INSERT INTO movimientos_tesoreria (id, cajaBancoId, tipo, concepto, monto, fecha) VALUES (?,?,?,?,?,?)")
      .run(nid("mvt"), cajaBancoId, "ingreso", `Recibo de caja ${numero} - Factura ${fac.numero}`, monto, f);
    const tercero = db.prepare("SELECT nombre FROM terceros WHERE id = ?").get(fac.terceroId);
    crearComprobanteSQL({ tipo: "Recibo de caja", fecha: f, origen: { tipo: "recibo", id: recibo.id, numero },
      glosa: `Recaudo de factura ${fac.numero} - ${tercero?.nombre || ""}`,
      lineas: [
        { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: tercero?.nombre || "", debito: monto, credito: 0 },
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero?.nombre || "", debito: 0, credito: monto },
      ],
    });
    pushAudit(actor, "Registrar recibo de caja", `${numero} por ${fmtCOP(monto)} sobre ${fac.numero}`);
    return recibo;
  });
  return tx();
}

export function anularFactura(actor, { id: facturaId, motivo }) {
  const tx = db.transaction(() => {
    const fac = db.prepare("SELECT * FROM facturas WHERE id = ?").get(facturaId);
    if (!fac) return { error: "Factura no encontrada." };
    const pagos = JSON.parse(fac.pagos || "[]");
    if (pagos.length > 0) return { error: "No se puede anular una factura con recaudos aplicados. Reverse primero los recibos asociados." };
    if (!motivo || motivo.trim().length < 5) return { error: "Debe indicar un motivo de anulacion (minimo 5 caracteres)." };
    db.prepare("UPDATE facturas SET estado = 'anulada', estadoDian = 'anulado', motivoAnulacion = ? WHERE id = ?").run(motivo, facturaId);
    db.prepare("UPDATE terceros SET saldoCartera = MAX(0, saldoCartera - ?) WHERE id = ?").run(fac.saldo, fac.terceroId);
    const tercero = db.prepare("SELECT nombre FROM terceros WHERE id = ?").get(fac.terceroId);
    crearComprobanteSQL({ tipo: "Anulacion factura", fecha: todayISO(), origen: { tipo: "factura", id: fac.id, numero: fac.numero },
      glosa: `Anulacion de factura ${fac.numero}. Motivo: ${motivo}`,
      lineas: [
        { cuenta: "4135", nombre: "Ingresos por venta de mercancia", tercero: tercero?.nombre || "", debito: fac.subtotal, credito: 0 },
        { cuenta: "2408", nombre: "IVA por pagar (generado)", tercero: tercero?.nombre || "", debito: fac.iva, credito: 0 },
        { cuenta: "1305", nombre: "Clientes nacionales (CxC)", tercero: tercero?.nombre || "", debito: 0, credito: fac.total },
      ],
    });
    pushAudit(actor, "Anular factura", `${fac.numero}. Motivo: ${motivo}`);
    return fac;
  });
  return tx();
}

/* ====== COMPRAS ====== */

export function crearOrdenCompra(actor, { proveedorId, sedeId, bodegaId, items }) {
  const tx = db.transaction(() => {
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "ordenCompra", "OC");
    const id = nid("oc");
    const itemsEnq = items.map((i) => {
      const prod = db.prepare("SELECT nombre, codigo FROM productos WHERE id = ?").get(i.productoId);
      return { ...i, nombre: prod?.nombre, codigo: prod?.codigo };
    });
    const total = itemsEnq.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
    db.prepare("INSERT INTO ordenes_compra (id,numero,proveedorId,sedeId,bodegaId,fecha,total,estado,recibidoItems,items) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run(id, numero, proveedorId, sedeId, bodegaId, fecha, total, "pendiente", "{}", JSON.stringify(itemsEnq));
    pushAudit(actor, "Crear orden de compra", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, proveedorId, sedeId, bodegaId, fecha, items: itemsEnq, total, estado: "pendiente", recibidoItems: {} };
  });
  return tx();
}

export function recibirOrdenCompra(actor, { ocId, items: itemsRecibidos }) {
  const tx = db.transaction(() => {
    const oc = db.prepare("SELECT * FROM ordenes_compra WHERE id = ?").get(ocId);
    if (!oc) return { error: "Orden de compra no encontrada." };
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "recepcion", "REC");
    const recibidoItems = JSON.parse(oc.recibidoItems || "{}");
    for (const it of itemsRecibidos) {
      const itemOC = (JSON.parse(oc.items || "[]")).find((x) => x.productoId === it.productoId);
      moverInventarioSQL({ productoId: it.productoId, bodegaId: oc.bodegaId, cantidad: it.cantidad, tipo: "entrada", origen: `Recepcion ${numero} (OC ${oc.numero})`, fecha, costoUnitario: itemOC?.costoUnitario });
      recibidoItems[it.productoId] = (recibidoItems[it.productoId] || 0) + it.cantidad;
    }
    const itemsOC = JSON.parse(oc.items || "[]");
    const totalPedido = itemsOC.reduce((s, i) => s + i.cantidad, 0);
    const totalRecibido = Object.values(recibidoItems).reduce((s, v) => s + v, 0);
    const nuevoEstado = totalRecibido >= totalPedido ? "recibida" : "recibida_parcial";
    db.prepare("UPDATE ordenes_compra SET estado = ?, recibidoItems = ? WHERE id = ?").run(nuevoEstado, JSON.stringify(recibidoItems), ocId);
    const itemsEnq = itemsRecibidos.map((it) => {
      const itemOC = itemsOC.find((x) => x.productoId === it.productoId);
      return { ...it, nombre: itemOC?.nombre, codigo: itemOC?.codigo };
    });
    const id = nid("rcp");
    db.prepare("INSERT INTO recepciones (id,numero,ocId,fecha,items) VALUES (?,?,?,?,?)").run(id, numero, ocId, fecha, JSON.stringify(itemsEnq));
    pushAudit(actor, "Recibir orden de compra", `${numero} sobre ${oc.numero}`);
    return { id, numero, ocId, items: itemsEnq, fecha };
  });
  return tx();
}

export function generarFacturaCompra(actor, { recepcionId }) {
  const tx = db.transaction(() => {
    const rcp = db.prepare("SELECT * FROM recepciones WHERE id = ?").get(recepcionId);
    if (!rcp) return { error: "Recepcion no encontrada." };
    const ya = db.prepare("SELECT id FROM facturas_compra WHERE recepcionId = ?").get(recepcionId);
    if (ya) return { error: "Esta recepcion ya tiene una factura de compra asociada." };
    const oc = db.prepare("SELECT * FROM ordenes_compra WHERE id = ?").get(rcp.ocId);
    const prov = db.prepare("SELECT * FROM terceros WHERE id = ?").get(oc.proveedorId);
    const itemsRcp = JSON.parse(rcp.items || "[]");
    const itemsOC = JSON.parse(oc.items || "[]");
    const fecha = todayISO();
    const numero = nextConsecutivo(null, "facturaCompra", "FC");
    const id = nid("fc");
    const subtotal = itemsRcp.reduce((s, it) => { const itemOC = itemsOC.find((x) => x.productoId === it.productoId); return s + it.cantidad * (itemOC?.costoUnitario || 0); }, 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const vencimiento = addDays(fecha, prov.condicionPagoDias || 30).slice(0, 10);
    db.prepare("INSERT INTO facturas_compra (id,numero,recepcionId,ocId,proveedorId,fecha,vencimiento,subtotal,iva,total,saldo,estado,items) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(id, numero, recepcionId, oc.id, oc.proveedorId, fecha, vencimiento, subtotal, iva, total, total, "pendiente", JSON.stringify(itemsRcp));
    db.prepare("UPDATE terceros SET saldoCxP = saldoCxP + ? WHERE id = ?").run(total, oc.proveedorId);
    crearComprobanteSQL({ tipo: "Factura de compra", fecha, origen: { tipo: "facturaCompra", id, numero },
      glosa: `Compra segun factura proveedor ${numero} - ${prov.nombre}`,
      lineas: [
        { cuenta: "1435", nombre: "Inventario de mercancias", tercero: prov.nombre, debito: subtotal, credito: 0 },
        { cuenta: "2409", nombre: "IVA descontable (compras)", tercero: prov.nombre, debito: iva, credito: 0 },
        { cuenta: "2205", nombre: "Proveedores nacionales (CxP)", tercero: prov.nombre, debito: 0, credito: total },
      ],
    });
    pushAudit(actor, "Registrar factura de compra", `${numero} por ${fmtCOP(total)}`);
    return { id, numero, recepcionId, ocId: oc.id, proveedorId: oc.proveedorId, fecha, vencimiento, items: itemsRcp, subtotal, iva, total, saldo: total, estado: "pendiente" };
  });
  return tx();
}

export function pagarFacturaCompra(actor, { facturaCompraId, monto, cajaBancoId, fecha }) {
  const tx = db.transaction(() => {
    const fc = db.prepare("SELECT * FROM facturas_compra WHERE id = ?").get(facturaCompraId);
    if (!fc) return { error: "Factura de compra no encontrada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (monto > fc.saldo + 0.5) return { error: `El monto supera el saldo pendiente (${fmtCOP(fc.saldo)}).` };
    const f = fecha || todayISO();
    const numero = nextConsecutivo(null, "egreso", "CE");
    const nuevoSaldo = Math.round((fc.saldo - monto) * 100) / 100;
    const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "parcial";
    db.prepare("UPDATE facturas_compra SET saldo = ?, estado = ? WHERE id = ?").run(nuevoSaldo, nuevoEstado, facturaCompraId);
    db.prepare("UPDATE terceros SET saldoCxP = MAX(0, saldoCxP - ?) WHERE id = ?").run(monto, fc.proveedorId);
    const cb = db.prepare("SELECT * FROM cajas_bancos WHERE id = ?").get(cajaBancoId);
    if (cb) db.prepare("UPDATE cajas_bancos SET saldo = saldo - ? WHERE id = ?").run(monto, cajaBancoId);
    db.prepare("INSERT INTO movimientos_tesoreria (id, cajaBancoId, tipo, concepto, monto, fecha) VALUES (?,?,?,?,?,?)")
      .run(nid("mvt"), cajaBancoId, "egreso", `Comprobante de egreso ${numero} - Factura compra ${fc.numero}`, monto, f);
    const prov = db.prepare("SELECT nombre FROM terceros WHERE id = ?").get(fc.proveedorId);
    crearComprobanteSQL({ tipo: "Comprobante de egreso", fecha: f, origen: { tipo: "egreso", id: numero, numero },
      glosa: `Pago factura de compra ${fc.numero} - ${prov?.nombre || ""}`,
      lineas: [
        { cuenta: "2205", nombre: "Proveedores nacionales (CxP)", tercero: prov?.nombre || "", debito: monto, credito: 0 },
        { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: prov?.nombre || "", debito: 0, credito: monto },
      ],
    });
    pushAudit(actor, "Pagar factura de compra", `${numero} por ${fmtCOP(monto)}`);
    return { numero, monto };
  });
  return tx();
}

/* ====== INVENTARIO / TESORERIA / CONTABILIDAD ====== */

export function ajusteInventario(actor, { productoId, bodegaId, cantidad, tipo, motivo }) {
  const tx = db.transaction(() => {
    const stock = db.prepare("SELECT cantidad FROM producto_stock WHERE productoId = ? AND bodegaId = ?").get(productoId, bodegaId);
    if (tipo === "salida" && (stock?.cantidad || 0) < cantidad) return { error: "El ajuste de salida supera el stock disponible." };
    moverInventarioSQL({ productoId, bodegaId, cantidad: Math.abs(cantidad), tipo, origen: `Ajuste manual (${motivo})`, fecha: todayISO() });
    const prod = db.prepare("SELECT nombre FROM productos WHERE id = ?").get(productoId);
    pushAudit(actor, "Ajuste de inventario", `${tipo} de ${cantidad} und. de ${prod?.nombre}. Motivo: ${motivo}`);
    return { ok: true };
  });
  return tx();
}

export function transferenciaInventario(actor, { productoId, origenBodegaId, destinoBodegaId, cantidad }) {
  const tx = db.transaction(() => {
    if (origenBodegaId === destinoBodegaId) return { error: "La bodega de origen y destino deben ser diferentes." };
    const stock = db.prepare("SELECT cantidad FROM producto_stock WHERE productoId = ? AND bodegaId = ?").get(productoId, origenBodegaId);
    if ((stock?.cantidad || 0) < cantidad) return { error: "Stock insuficiente en la bodega de origen." };
    const fecha = todayISO();
    moverInventarioSQL({ productoId, bodegaId: origenBodegaId, cantidad, tipo: "salida", origen: `Transferencia a ${destinoBodegaId}`, fecha });
    moverInventarioSQL({ productoId, bodegaId: destinoBodegaId, cantidad, tipo: "entrada", origen: `Transferencia desde ${origenBodegaId}`, fecha });
    const prod = db.prepare("SELECT nombre FROM productos WHERE id = ?").get(productoId);
    pushAudit(actor, "Transferencia de inventario", `${cantidad} und. de ${prod?.nombre}`);
    return { ok: true };
  });
  return tx();
}

export function registrarMovimientoTesoreriaManual(actor, { cajaBancoId, tipo, concepto, monto, cuentaContrapartida }) {
  const tx = db.transaction(() => {
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    const cb = db.prepare("SELECT * FROM cajas_bancos WHERE id = ?").get(cajaBancoId);
    if (!cb) return { error: "Caja o banco no encontrado." };
    if (tipo === "egreso" && cb.saldo < monto) return { error: "Saldo insuficiente en la caja/banco seleccionado." };
    const fecha = todayISO();
    const numero = nextConsecutivo(null, tipo === "ingreso" ? "reciboCaja" : "egreso", tipo === "ingreso" ? "RC" : "CE");
    db.prepare("UPDATE cajas_bancos SET saldo = saldo + ? WHERE id = ?").run(tipo === "ingreso" ? monto : -monto, cajaBancoId);
    db.prepare("INSERT INTO movimientos_tesoreria (id, cajaBancoId, tipo, concepto, monto, fecha) VALUES (?,?,?,?,?,?)")
      .run(nid("mvt"), cajaBancoId, tipo, `${numero} — ${concepto}`, monto, fecha);
    const cuentaCaja = cb.tipo === "caja" ? "1105" : "1110";
    const c = db.prepare("SELECT nombre FROM plan_cuentas WHERE codigo = ?").get(cuentaContrapartida);
    const lineas = tipo === "ingreso"
      ? [{ cuenta: cuentaCaja, nombre: cuentaCaja === "1105" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: monto, credito: 0 }, { cuenta: cuentaContrapartida, nombre: c?.nombre || cuentaContrapartida, tercero: "-", debito: 0, credito: monto }]
      : [{ cuenta: cuentaContrapartida, nombre: c?.nombre || cuentaContrapartida, tercero: "-", debito: monto, credito: 0 }, { cuenta: cuentaCaja, nombre: cuentaCaja === "1105" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: 0, credito: monto }];
    crearComprobanteSQL({ tipo: tipo === "ingreso" ? "Recibo de caja" : "Comprobante de egreso", fecha, origen: { tipo: "manual" }, glosa: concepto, lineas });
    pushAudit(actor, tipo === "ingreso" ? "Registrar ingreso de tesoreria" : "Registrar egreso de tesoreria", `${numero} por ${fmtCOP(monto)} — ${concepto}`);
    return { numero };
  });
  return tx();
}

export function transferenciaTesoreria(actor, { origenId, destinoId, monto }) {
  const tx = db.transaction(() => {
    if (origenId === destinoId) return { error: "Selecciona cuentas de origen y destino diferentes." };
    const origen = db.prepare("SELECT * FROM cajas_bancos WHERE id = ?").get(origenId);
    const destino = db.prepare("SELECT * FROM cajas_bancos WHERE id = ?").get(destinoId);
    if (!origen || !destino) return { error: "Cuenta no encontrada." };
    if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
    if (origen.saldo < monto) return { error: "Saldo insuficiente en la cuenta de origen." };
    const fecha = todayISO();
    db.prepare("UPDATE cajas_bancos SET saldo = saldo - ? WHERE id = ?").run(monto, origenId);
    db.prepare("UPDATE cajas_bancos SET saldo = saldo + ? WHERE id = ?").run(monto, destinoId);
    db.prepare("INSERT INTO movimientos_tesoreria (id, cajaBancoId, tipo, concepto, monto, fecha) VALUES (?,?,?,?,?,?)")
      .run(nid("mvt"), origenId, "egreso", `Transferencia a ${destino.nombre}`, monto, fecha);
    db.prepare("INSERT INTO movimientos_tesoreria (id, cajaBancoId, tipo, concepto, monto, fecha) VALUES (?,?,?,?,?,?)")
      .run(nid("mvt"), destinoId, "ingreso", `Transferencia desde ${origen.nombre}`, monto, fecha);
    crearComprobanteSQL({ tipo: "Transferencia entre cuentas", fecha, origen: { tipo: "transferencia" }, glosa: `Transferencia de ${origen.nombre} a ${destino.nombre}`,
      lineas: [{ cuenta: destino.tipo === "caja" ? "1105" : "1110", nombre: destino.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: monto, credito: 0 }, { cuenta: origen.tipo === "caja" ? "1105" : "1110", nombre: origen.tipo === "caja" ? "Caja general" : "Bancos - Cta corriente", tercero: "-", debito: 0, credito: monto }],
    });
    pushAudit(actor, "Transferencia entre cuentas", `${fmtCOP(monto)} de ${origen.nombre} a ${destino.nombre}`);
    return { ok: true };
  });
  return tx();
}

export function crearComprobanteManual(actor, { tipo, fecha, glosa, lineas }) {
  const tx = db.transaction(() => {
    const totalDebito = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
    const totalCredito = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
    if (Math.abs(totalDebito - totalCredito) > 0.5) return { error: `El comprobante no cuadra: debitos ${fmtCOP(totalDebito)} vs creditos ${fmtCOP(totalCredito)}.` };
    if (lineas.length < 2) return { error: "Un comprobante requiere al menos dos lineas (partida doble)." };
    const comp = crearComprobanteSQL({ tipo, fecha, origen: { tipo: "manual" }, glosa, lineas });
    pushAudit(actor, "Registrar comprobante manual", `${comp.numero} - ${glosa}`);
    return comp;
  });
  return tx();
}

export function liquidarNomina(actor, { periodo, empleadoIds }) {
  const tx = db.transaction(() => {
    const SM = 1300000;
    const empleados = db.prepare(`SELECT * FROM empleados WHERE id IN (${empleadoIds.map(() => "?").join(",")})`).all(...empleadoIds);
    if (empleados.length === 0) return { error: "Selecciona al menos un empleado." };
    const ya = db.prepare("SELECT id FROM nominas WHERE periodo = ?").get(periodo);
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
      db.prepare("INSERT INTO nominas (id,periodo,fecha,empleadoId,empleadoNombre,cargo,salarioBase,auxTransporte,deducciones,deduccionesTotal,netoPagar,aportesPatronales,aportesPatronalesTotal,prestaciones,prestacionesTotal,costoTotalEmpresa) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(id, periodo, fecha, emp.id, emp.nombre, emp.cargo, s, aux, JSON.stringify({ salud: sEmp, pension: pEmp, fsp }), ded, neto, JSON.stringify({ salud: sPat, pension: pPat, arl, sena, icbf, ccf }), aportes, JSON.stringify({ cesantias: ces, prima, vacaciones: vac, intCesantias: intC }), prest, s + aux + aportes + prest);
      nominasGen.push({ id, periodo, fecha, empleadoId: emp.id, empleadoNombre: emp.nombre, cargo: emp.cargo, salarioBase: s, auxTransporte: aux, deducciones: { salud: sEmp, pension: pEmp, fsp }, deduccionesTotal: ded, netoPagar: neto, aportesPatronales: { salud: sPat, pension: pPat, arl, sena, icbf, ccf }, aportesPatronalesTotal: aportes, prestaciones: { cesantias: ces, prima, vacaciones: vac, intCesantias: intC }, prestacionesTotal: prest, costoTotalEmpresa: s + aux + aportes + prest });
      crearComprobanteSQL({ tipo: "Nomina", fecha, origen: { tipo: "nomina", id, periodo },
        glosa: `Nomina ${periodo} — ${emp.nombre} (${emp.cargo})`,
        lineas: [
          { cuenta: "5105", nombre: "Gastos de personal", tercero: emp.nombre, debito: s + aux + aportes + prest, credito: 0 },
          { cuenta: "1110", nombre: "Bancos - Cta corriente", tercero: emp.nombre, debito: 0, credito: neto },
          { cuenta: "2505", nombre: "Salarios y prestaciones por pagar", tercero: emp.nombre, debito: 0, credito: ded + aportes },
        ],
      });
      db.prepare("UPDATE cajas_bancos SET saldo = saldo - ? WHERE tipo = 'banco' AND id = (SELECT id FROM cajas_bancos WHERE tipo = 'banco' LIMIT 1)").run(neto);
    }
    pushAudit(actor, "Liquidar nomina", `Periodo ${periodo} — ${nominasGen.length} empleado(s)`);
    return { nominas: nominasGen };
  });
  return tx();
}

export function simularRespuestaDian(actor, { id: facturaId }) {
  const tx = db.transaction(() => {
    const fac = db.prepare("SELECT * FROM facturas WHERE id = ?").get(facturaId);
    if (!fac) return { error: "Factura no encontrada." };
    const r = Math.random();
    const estadoDian = r < 0.85 ? "aceptado" : r < 0.95 ? "contingencia" : "rechazado";
    const cufe = estadoDian === "aceptado" ? `CUFE-SIM-${Math.random().toString(36).slice(2, 18)}` : null;
    db.prepare("UPDATE facturas SET estadoDian = ?, cufe = ? WHERE id = ?").run(estadoDian, cufe, facturaId);
    pushAudit(actor, "Simular respuesta DIAN (sandbox)", `${fac.numero}: ${estadoDian}`);
    return { estadoDian, cufe };
  });
  return tx();
}

/* ---------- formato ---------- */
function fmtCOP(n) { return n?.toLocaleString?.("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }) || `$${n}`; }
