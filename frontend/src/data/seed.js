import { nid, fmtCOP, todayISO, addDays, setClock } from "./utils.js";
import { EMPRESA, SEDES, BODEGAS, PLAN_CUENTAS, CAJAS_BANCOS_SEED, TERCEROS_SEED, PRODUCTOS_SEED, EMPLEADOS_SEED, cuenta } from "./constants.js";

/* ============================================================================
   MOTOR DE REGLAS DE NEGOCIO
   Todas las funciones reciben "draft" (un clon mutable del estado) y lo
   modifican en el sitio. Las mismas funciones se usan tanto para poblar los
   datos de demostracion (buildSeed) como para las acciones reales del
   usuario en la app -> una sola fuente de verdad para las reglas.
   ============================================================================ */

function pushAudit(draft, actor, accion, detalle) {
  draft.auditLog.unshift({ id: nid("aud"), fecha: todayISO(), usuario: actor?.usuario || "Usuario demo", rol: actor?.rol || "-", accion, detalle });
}

function nextConsecutivo(draft, key, prefix) {
  const year = new Date(todayISO()).getFullYear();
  const seq = (draft.consecutivos[key] = (draft.consecutivos[key] || 0) + 1);
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

function crearComprobante(draft, { tipo, fecha, origen, lineas, glosa }) {
  const totalDebito = lineas.reduce((s, l) => s + (l.debito || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (l.credito || 0), 0);
  const numero = nextConsecutivo(draft, "comprobante", "CC");
  const comp = { id: nid("cmp"), numero, tipo, fecha, origen, glosa, lineas, totalDebito, totalCredito, balanceado: Math.abs(totalDebito - totalCredito) < 1 };
  draft.comprobantes.push(comp);
  return comp;
}

function moverInventario(draft, { productoId, bodegaId, cantidad, tipo, origen, fecha, costoUnitario }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return;
  const stockAntes = prod.stock[bodegaId] || 0;
  if (tipo === "entrada") {
    if (costoUnitario != null && costoUnitario >= 0) {
      const stockTotalAntes = Object.values(prod.stock).reduce((s, v) => s + v, 0);
      const valorAntes = stockTotalAntes * (prod.costoPromedio || 0);
      const valorEntrada = cantidad * costoUnitario;
      const nuevoTotal = stockTotalAntes + cantidad;
      prod.costoPromedio = nuevoTotal > 0 ? (valorAntes + valorEntrada) / nuevoTotal : costoUnitario;
    }
    prod.stock[bodegaId] = stockAntes + cantidad;
  } else {
    prod.stock[bodegaId] = stockAntes - cantidad;
  }
  draft.movimientosInventario.unshift({ id: nid("mov"), productoId, bodegaId, cantidad, tipo, origen, fecha, saldoResultante: prod.stock[bodegaId] });
}

function crearCotizacion(draft, actor, { terceroId, sedeId, items, vendedor }) {
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "cotizacion", "COT");
  const itemsEnriquecidos = items.map((i) => {
    const prod = draft.productos.find((p) => p.id === i.productoId);
    return { ...i, nombre: prod?.nombre, codigo: prod?.codigo };
  });
  const subtotal = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const iva = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.precio * ((i.ivaPct ?? 19) / 100), 0);
  const total = subtotal + iva;
  const cot = { id: nid("cot"), numero, terceroId, sedeId, vendedor: vendedor || "Usuario demo", fecha, items: itemsEnriquecidos, subtotal, iva, total, estado: "borrador" };
  draft.cotizaciones.unshift(cot);
  pushAudit(draft, actor, "Crear cotizacion", `${numero} por ${fmtCOP(total)}`);
  return cot;
}

function aprobarCotizacion(draft, actor, cotizacionId) {
  const cot = draft.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot || cot.estado !== "borrador") return { error: "Solo se pueden aprobar cotizaciones en borrador." };
  cot.estado = "aprobada";
  pushAudit(draft, actor, "Aprobar cotizacion", cot.numero);
  return cot;
}

function convertirPedido(draft, actor, cotizacionId) {
  const cot = draft.cotizaciones.find((c) => c.id === cotizacionId);
  if (!cot || cot.estado !== "aprobada") return { error: "La cotizacion debe estar aprobada antes de convertirla en pedido." };
  const numero = nextConsecutivo(draft, "pedido", "PED");
  const ped = { id: nid("ped"), numero, cotizacionId, terceroId: cot.terceroId, sedeId: cot.sedeId, fecha: todayISO(), items: cot.items, subtotal: cot.subtotal, iva: cot.iva, total: cot.total, estado: "pendiente" };
  draft.pedidos.unshift(ped);
  cot.estado = "convertida";
  pushAudit(draft, actor, "Convertir cotizacion a pedido", `${cot.numero} -> ${numero}`);
  return ped;
}

function generarRemision(draft, actor, pedidoId, bodegaId) {
  const ped = draft.pedidos.find((p) => p.id === pedidoId);
  if (!ped || ped.estado === "remisionado") return { error: "El pedido no existe o ya fue remisionado." };
  for (const it of ped.items) {
    const prod = draft.productos.find((p) => p.id === it.productoId);
    if (prod && prod.categoria !== "Servicios" && (prod.stock[bodegaId] || 0) < it.cantidad) {
      return { error: `Stock insuficiente de "${prod.nombre}" en la bodega seleccionada (disponible ${prod.stock[bodegaId] || 0}, requerido ${it.cantidad}).` };
    }
  }
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "remision", "REM");
  const rem = { id: nid("rem"), numero, pedidoId, terceroId: ped.terceroId, bodegaId, fecha, items: ped.items, estado: "entregada" };
  draft.remisiones.unshift(rem);
  ped.estado = "remisionado";
  for (const it of ped.items) {
    const prod = draft.productos.find((p) => p.id === it.productoId);
    if (prod && prod.categoria !== "Servicios") {
      moverInventario(draft, { productoId: it.productoId, bodegaId, cantidad: it.cantidad, tipo: "salida", origen: `Remision ${numero}`, fecha });
    }
  }
  pushAudit(draft, actor, "Generar remision", `${numero} de pedido ${ped.numero}`);
  return rem;
}

function generarFactura(draft, actor, remisionId) {
  const rem = draft.remisiones.find((r) => r.id === remisionId);
  if (!rem) return { error: "Remision no encontrada." };
  if (draft.facturas.some((f) => f.remisionId === remisionId)) return { error: "Esta remision ya tiene una factura asociada." };
  const ped = draft.pedidos.find((p) => p.id === rem.pedidoId);
  const tercero = draft.terceros.find((t) => t.id === rem.terceroId);
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "factura", "FV");
  const subtotal = ped.subtotal, iva = ped.iva, total = ped.total;
  const vencimiento = addDays(fecha, tercero.condicionPagoDias || 0);
  const fac = { id: nid("fac"), numero, remisionId, pedidoId: ped.id, terceroId: rem.terceroId, sedeId: ped.sedeId, fecha, vencimiento, items: ped.items, subtotal, iva, total, saldo: total, estado: "pendiente", estadoDian: "borrador", cufe: null, pagos: [] };
  draft.facturas.unshift(fac);
  tercero.saldoCartera = (tercero.saldoCartera || 0) + total;
  crearComprobante(draft, {
    tipo: "Factura de venta", fecha, origen: { tipo: "factura", id: fac.id, numero },
    glosa: `Venta segun factura ${numero} a ${tercero.nombre}`,
    lineas: [
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: total, credito: 0 },
      { cuenta: "4135", nombre: cuenta("4135").nombre, tercero: tercero.nombre, debito: 0, credito: subtotal },
      { cuenta: "2408", nombre: cuenta("2408").nombre, tercero: tercero.nombre, debito: 0, credito: iva },
    ],
  });
  const costoTotal = ped.items.reduce((s, it) => {
    const p = draft.productos.find((pp) => pp.id === it.productoId);
    return s + (p && p.categoria !== "Servicios" ? it.cantidad * (p.costoPromedio || 0) : 0);
  }, 0);
  if (costoTotal > 0) {
    crearComprobante(draft, {
      tipo: "Costo de venta", fecha, origen: { tipo: "factura", id: fac.id, numero },
      glosa: `Costo de venta asociado a factura ${numero}`,
      lineas: [
        { cuenta: "6135", nombre: cuenta("6135").nombre, tercero: tercero.nombre, debito: costoTotal, credito: 0 },
        { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: tercero.nombre, debito: 0, credito: costoTotal },
      ],
    });
  }
  pushAudit(draft, actor, "Emitir factura de venta", `${numero} por ${fmtCOP(total)}`);
  return fac;
}

function registrarRecibo(draft, actor, { facturaId, monto, medioPago, cajaBancoId, fecha }) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac || fac.estado === "anulada") return { error: "La factura no existe o esta anulada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (monto > fac.saldo + 0.5) return { error: `El monto (${fmtCOP(monto)}) supera el saldo pendiente (${fmtCOP(fac.saldo)}).` };
  const f = fecha || todayISO();
  const numero = nextConsecutivo(draft, "reciboCaja", "RC");
  const recibo = { id: nid("rec"), numero, facturaId, monto, medioPago, cajaBancoId, fecha: f };
  fac.pagos.push(recibo);
  fac.saldo = Math.round((fac.saldo - monto) * 100) / 100;
  fac.estado = fac.saldo <= 0 ? "pagada" : "parcial";
  const tercero = draft.terceros.find((t) => t.id === fac.terceroId);
  tercero.saldoCartera = Math.max(0, Math.round(((tercero.saldoCartera || 0) - monto) * 100) / 100);
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (cb) cb.saldo += monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo: "ingreso", concepto: `Recibo de caja ${numero} - Factura ${fac.numero}`, monto, fecha: f });
  crearComprobante(draft, {
    tipo: "Recibo de caja", fecha: f, origen: { tipo: "recibo", id: recibo.id, numero },
    glosa: `Recaudo de factura ${fac.numero} - ${tercero.nombre}`,
    lineas: [
      { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? cuenta("1105").nombre : cuenta("1110").nombre, tercero: tercero.nombre, debito: monto, credito: 0 },
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: 0, credito: monto },
    ],
  });
  pushAudit(draft, actor, "Registrar recibo de caja", `${numero} por ${fmtCOP(monto)} sobre ${fac.numero}`);
  return recibo;
}

function anularFactura(draft, actor, facturaId, motivo) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac) return { error: "Factura no encontrada." };
  if (fac.pagos.length > 0) return { error: "No se puede anular una factura con recaudos aplicados. Reverse primero los recibos asociados." };
  if (!motivo || motivo.trim().length < 5) return { error: "Debe indicar un motivo de anulacion (minimo 5 caracteres)." };
  fac.estado = "anulada";
  fac.estadoDian = "anulado";
  fac.motivoAnulacion = motivo;
  const tercero = draft.terceros.find((t) => t.id === fac.terceroId);
  tercero.saldoCartera = Math.max(0, Math.round(((tercero.saldoCartera || 0) - fac.saldo) * 100) / 100);
  crearComprobante(draft, {
    tipo: "Anulacion factura", fecha: todayISO(), origen: { tipo: "factura", id: fac.id, numero: fac.numero },
    glosa: `Anulacion de factura ${fac.numero}. Motivo: ${motivo}`,
    lineas: [
      { cuenta: "4135", nombre: cuenta("4135").nombre, tercero: tercero.nombre, debito: fac.subtotal, credito: 0 },
      { cuenta: "2408", nombre: cuenta("2408").nombre, tercero: tercero.nombre, debito: fac.iva, credito: 0 },
      { cuenta: "1305", nombre: cuenta("1305").nombre, tercero: tercero.nombre, debito: 0, credito: fac.total },
    ],
  });
  pushAudit(draft, actor, "Anular factura", `${fac.numero}. Motivo: ${motivo}`);
  return fac;
}

function crearOrdenCompra(draft, actor, { proveedorId, sedeId, bodegaId, items }) {
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "ordenCompra", "OC");
  const itemsEnriquecidos = items.map((i) => { const prod = draft.productos.find((p) => p.id === i.productoId); return { ...i, nombre: prod?.nombre, codigo: prod?.codigo }; });
  const total = itemsEnriquecidos.reduce((s, i) => s + i.cantidad * i.costoUnitario, 0);
  const oc = { id: nid("oc"), numero, proveedorId, sedeId, bodegaId, fecha, items: itemsEnriquecidos, total, estado: "pendiente", recibidoItems: {} };
  draft.ordenesCompra.unshift(oc);
  pushAudit(draft, actor, "Crear orden de compra", `${numero} por ${fmtCOP(total)}`);
  return oc;
}

function recibirOrdenCompra(draft, actor, ocId, itemsRecibidos) {
  const oc = draft.ordenesCompra.find((o) => o.id === ocId);
  if (!oc) return { error: "Orden de compra no encontrada." };
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "recepcion", "REC");
  for (const it of itemsRecibidos) {
    const itemOC = oc.items.find((x) => x.productoId === it.productoId);
    moverInventario(draft, { productoId: it.productoId, bodegaId: oc.bodegaId, cantidad: it.cantidad, tipo: "entrada", origen: `Recepcion ${numero} (OC ${oc.numero})`, fecha, costoUnitario: itemOC?.costoUnitario });
    oc.recibidoItems[it.productoId] = (oc.recibidoItems[it.productoId] || 0) + it.cantidad;
  }
  const totalPedido = oc.items.reduce((s, i) => s + i.cantidad, 0);
  const totalRecibido = Object.values(oc.recibidoItems).reduce((s, v) => s + v, 0);
  oc.estado = totalRecibido >= totalPedido ? "recibida" : "recibida_parcial";
  const itemsEnriquecidos = itemsRecibidos.map((it) => { const itemOC = oc.items.find((x) => x.productoId === it.productoId); return { ...it, nombre: itemOC?.nombre, codigo: itemOC?.codigo }; });
  const recepcion = { id: nid("rcp"), numero, ocId, items: itemsEnriquecidos, fecha };
  draft.recepciones.unshift(recepcion);
  pushAudit(draft, actor, "Recibir orden de compra", `${numero} sobre ${oc.numero}`);
  return recepcion;
}

function generarFacturaCompra(draft, actor, recepcionId) {
  const rcp = draft.recepciones.find((r) => r.id === recepcionId);
  if (!rcp) return { error: "Recepcion no encontrada." };
  if (draft.facturasCompra.some((f) => f.recepcionId === recepcionId)) return { error: "Esta recepcion ya tiene una factura de compra asociada." };
  const oc = draft.ordenesCompra.find((o) => o.id === rcp.ocId);
  const prov = draft.terceros.find((t) => t.id === oc.proveedorId);
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, "facturaCompra", "FC");
  const subtotal = rcp.items.reduce((s, it) => { const itemOC = oc.items.find((x) => x.productoId === it.productoId); return s + it.cantidad * (itemOC?.costoUnitario || 0); }, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;
  const vencimiento = addDays(fecha, prov.condicionPagoDias || 30);
  const fc = { id: nid("fc"), numero, recepcionId, ocId: oc.id, proveedorId: oc.proveedorId, fecha, vencimiento, items: rcp.items, subtotal, iva, total, saldo: total, estado: "pendiente" };
  draft.facturasCompra.unshift(fc);
  prov.saldoCxP = (prov.saldoCxP || 0) + total;
  crearComprobante(draft, {
    tipo: "Factura de compra", fecha, origen: { tipo: "facturaCompra", id: fc.id, numero },
    glosa: `Compra segun factura proveedor ${numero} - ${prov.nombre}`,
    lineas: [
      { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: prov.nombre, debito: subtotal, credito: 0 },
      { cuenta: "2409", nombre: cuenta("2409").nombre, tercero: prov.nombre, debito: iva, credito: 0 },
      { cuenta: "2205", nombre: cuenta("2205").nombre, tercero: prov.nombre, debito: 0, credito: total },
    ],
  });
  pushAudit(draft, actor, "Registrar factura de compra", `${numero} por ${fmtCOP(total)}`);
  return fc;
}

function pagarFacturaCompra(draft, actor, { facturaCompraId, monto, cajaBancoId, fecha }) {
  const fc = draft.facturasCompra.find((f) => f.id === facturaCompraId);
  if (!fc) return { error: "Factura de compra no encontrada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (monto > fc.saldo + 0.5) return { error: `El monto supera el saldo pendiente (${fmtCOP(fc.saldo)}).` };
  const f = fecha || todayISO();
  const numero = nextConsecutivo(draft, "egreso", "CE");
  fc.saldo = Math.round((fc.saldo - monto) * 100) / 100;
  fc.estado = fc.saldo <= 0 ? "pagada" : "parcial";
  const prov = draft.terceros.find((t) => t.id === fc.proveedorId);
  prov.saldoCxP = Math.max(0, Math.round(((prov.saldoCxP || 0) - monto) * 100) / 100);
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (cb) cb.saldo -= monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo: "egreso", concepto: `Comprobante de egreso ${numero} - Factura compra ${fc.numero}`, monto, fecha: f });
  crearComprobante(draft, {
    tipo: "Comprobante de egreso", fecha: f, origen: { tipo: "egreso", id: numero, numero },
    glosa: `Pago factura de compra ${fc.numero} - ${prov.nombre}`,
    lineas: [
      { cuenta: "2205", nombre: cuenta("2205").nombre, tercero: prov.nombre, debito: monto, credito: 0 },
      { cuenta: cb?.tipo === "caja" ? "1105" : "1110", nombre: cb?.tipo === "caja" ? cuenta("1105").nombre : cuenta("1110").nombre, tercero: prov.nombre, debito: 0, credito: monto },
    ],
  });
  pushAudit(draft, actor, "Pagar factura de compra", `${numero} por ${fmtCOP(monto)}`);
  return { numero, monto };
}

function crearTercero(draft, actor, data) {
  if (draft.terceros.some((t) => t.numDoc === data.numDoc)) return { error: `Ya existe un tercero con el documento ${data.numDoc}.` };
  const t = { id: nid(data.tipo === "proveedor" ? "p" : "t"), saldoCartera: 0, saldoCxP: 0, creadoEn: todayISO(), ...data };
  draft.terceros.unshift(t);
  pushAudit(draft, actor, "Crear tercero", `${t.nombre} (${t.tipo})`);
  return t;
}

function crearProducto(draft, actor, data) {
  if (draft.productos.some((p) => p.codigo === data.codigo)) return { error: `Ya existe un producto con el codigo ${data.codigo}.` };
  const p = { id: nid("prod"), stock: {}, ...data };
  draft.productos.unshift(p);
  pushAudit(draft, actor, "Crear producto", `${p.codigo} - ${p.nombre}`);
  return p;
}

function ajusteInventario(draft, actor, { productoId, bodegaId, cantidad, tipo, motivo }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return { error: "Producto no encontrado." };
  if (tipo === "salida" && (prod.stock[bodegaId] || 0) < cantidad) return { error: "El ajuste de salida supera el stock disponible." };
  moverInventario(draft, { productoId, bodegaId, cantidad: Math.abs(cantidad), tipo, origen: `Ajuste manual (${motivo})`, fecha: todayISO() });
  pushAudit(draft, actor, "Ajuste de inventario", `${tipo} de ${cantidad} und. de ${prod.nombre}. Motivo: ${motivo}`);
}

function transferenciaInventario(draft, actor, { productoId, origenBodegaId, destinoBodegaId, cantidad }) {
  const prod = draft.productos.find((p) => p.id === productoId);
  if (!prod) return { error: "Producto no encontrado." };
  if (origenBodegaId === destinoBodegaId) return { error: "La bodega de origen y destino deben ser diferentes." };
  if ((prod.stock[origenBodegaId] || 0) < cantidad) return { error: "Stock insuficiente en la bodega de origen." };
  const fecha = todayISO();
  moverInventario(draft, { productoId, bodegaId: origenBodegaId, cantidad, tipo: "salida", origen: `Transferencia a ${destinoBodegaId}`, fecha });
  moverInventario(draft, { productoId, bodegaId: destinoBodegaId, cantidad, tipo: "entrada", origen: `Transferencia desde ${origenBodegaId}`, fecha });
  pushAudit(draft, actor, "Transferencia de inventario", `${cantidad} und. de ${prod.nombre}`);
}

function crearComprobanteManual(draft, actor, { tipo, fecha, glosa, lineas }) {
  const totalDebito = lineas.reduce((s, l) => s + (Number(l.debito) || 0), 0);
  const totalCredito = lineas.reduce((s, l) => s + (Number(l.credito) || 0), 0);
  if (Math.abs(totalDebito - totalCredito) > 0.5) return { error: `El comprobante no cuadra: debitos ${fmtCOP(totalDebito)} vs creditos ${fmtCOP(totalCredito)}.` };
  if (lineas.length < 2) return { error: "Un comprobante requiere al menos dos lineas (partida doble)." };
  const comp = crearComprobante(draft, { tipo, fecha, origen: { tipo: "manual" }, glosa, lineas });
  pushAudit(draft, actor, "Registrar comprobante manual", `${comp.numero} - ${glosa}`);
  return comp;
}

function registrarMovimientoTesoreriaManual(draft, actor, { cajaBancoId, tipo, concepto, monto, cuentaContrapartida, tercero }) {
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  const cb = draft.cajasBancos.find((c) => c.id === cajaBancoId);
  if (!cb) return { error: "Caja o banco no encontrado." };
  if (tipo === "egreso" && cb.saldo < monto) return { error: "Saldo insuficiente en la caja/banco seleccionado." };
  const fecha = todayISO();
  const numero = nextConsecutivo(draft, tipo === "ingreso" ? "reciboCaja" : "egreso", tipo === "ingreso" ? "RC" : "CE");
  cb.saldo += tipo === "ingreso" ? monto : -monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId, tipo, concepto: `${numero} — ${concepto}`, monto, fecha });
  const cuentaCaja = cb.tipo === "caja" ? "1105" : "1110";
  const cCuenta = cuenta(cuentaContrapartida);
  const lineas = tipo === "ingreso"
    ? [{ cuenta: cuentaCaja, nombre: cuenta(cuentaCaja).nombre, tercero: tercero || "-", debito: monto, credito: 0 }, { cuenta: cuentaContrapartida, nombre: cCuenta?.nombre || cuentaContrapartida, tercero: tercero || "-", debito: 0, credito: monto }]
    : [{ cuenta: cuentaContrapartida, nombre: cCuenta?.nombre || cuentaContrapartida, tercero: tercero || "-", debito: monto, credito: 0 }, { cuenta: cuentaCaja, nombre: cuenta(cuentaCaja).nombre, tercero: tercero || "-", debito: 0, credito: monto }];
  crearComprobante(draft, { tipo: tipo === "ingreso" ? "Recibo de caja" : "Comprobante de egreso", fecha, origen: { tipo: "manual" }, glosa: concepto, lineas });
  pushAudit(draft, actor, tipo === "ingreso" ? "Registrar ingreso de tesoreria" : "Registrar egreso de tesoreria", `${numero} por ${fmtCOP(monto)} — ${concepto}`);
  return { numero };
}

function transferenciaTesoreria(draft, actor, { origenId, destinoId, monto }) {
  if (origenId === destinoId) return { error: "Selecciona cuentas de origen y destino diferentes." };
  const origen = draft.cajasBancos.find((c) => c.id === origenId);
  const destino = draft.cajasBancos.find((c) => c.id === destinoId);
  if (!origen || !destino) return { error: "Cuenta no encontrada." };
  if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
  if (origen.saldo < monto) return { error: "Saldo insuficiente en la cuenta de origen." };
  const fecha = todayISO();
  origen.saldo -= monto; destino.saldo += monto;
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId: origenId, tipo: "egreso", concepto: `Transferencia a ${destino.nombre}`, monto, fecha });
  draft.movimientosTesoreria.unshift({ id: nid("mvt"), cajaBancoId: destinoId, tipo: "ingreso", concepto: `Transferencia desde ${origen.nombre}`, monto, fecha });
  crearComprobante(draft, {
    tipo: "Transferencia entre cuentas", fecha, origen: { tipo: "transferencia" }, glosa: `Transferencia de ${origen.nombre} a ${destino.nombre}`,
    lineas: [{ cuenta: destino.tipo === "caja" ? "1105" : "1110", nombre: cuenta(destino.tipo === "caja" ? "1105" : "1110").nombre, tercero: "-", debito: monto, credito: 0 }, { cuenta: origen.tipo === "caja" ? "1105" : "1110", nombre: cuenta(origen.tipo === "caja" ? "1105" : "1110").nombre, tercero: "-", debito: 0, credito: monto }],
  });
  pushAudit(draft, actor, "Transferencia entre cuentas", `${fmtCOP(monto)} de ${origen.nombre} a ${destino.nombre}`);
  return { ok: true };
}

function liquidarNomina(draft, actor, { periodo, empleadoIds }) {
  const SM = 1300000;
  const empleados = draft.empleados.filter((e) => empleadoIds.includes(e.id));
  if (empleados.length === 0) return { error: "Selecciona al menos un empleado." };
  if (draft.nominas.some((n) => n.periodo === periodo)) return { error: `El periodo ${periodo} ya fue liquidado.` };
  const fecha = todayISO();
  const nominasGen = [];
  for (const emp of empleados) {
    const salario = emp.salario;
    const auxTransporte = salario <= 2 * SM ? 200000 : 0;
    const saludEmp = Math.round(salario * 0.04);
    const pensionEmp = Math.round(salario * 0.04);
    const fsp = salario > 4 * SM ? Math.round(salario * 0.01) : 0;
    const deducciones = saludEmp + pensionEmp + fsp;
    const neto = salario + auxTransporte - deducciones;
    const saludPat = Math.round(salario * 0.085);
    const pensionPat = Math.round(salario * 0.12);
    const arl = Math.round(salario * 0.00522);
    const sena = Math.round(salario * 0.02);
    const icbf = Math.round(salario * 0.03);
    const ccf = Math.round(salario * 0.04);
    const aportesPatronales = saludPat + pensionPat + arl + sena + icbf + ccf;
    const cesantias = Math.round(salario * 0.0833);
    const prima = Math.round(salario * 0.0833);
    const vacaciones = Math.round(salario * 0.0417);
    const intCesantias = Math.round(cesantias * 0.12);
    const prestaciones = cesantias + prima + vacaciones + intCesantias;
    const nom = {
      id: nid("nom"), periodo, fecha, empleadoId: emp.id, empleadoNombre: emp.nombre, cargo: emp.cargo,
      salarioBase: salario, auxTransporte,
      deducciones: { salud: saludEmp, pension: pensionEmp, fsp }, deduccionesTotal: deducciones, netoPagar: neto,
      aportesPatronales: { salud: saludPat, pension: pensionPat, arl, sena, icbf, ccf }, aportesPatronalesTotal: aportesPatronales,
      prestaciones: { cesantias, prima, vacaciones, intCesantias }, prestacionesTotal: prestaciones,
      costoTotalEmpresa: salario + auxTransporte + aportesPatronales + prestaciones,
    };
    draft.nominas.unshift(nom);
    nominasGen.push(nom);
    crearComprobante(draft, {
      tipo: "Nomina", fecha, origen: { tipo: "nomina", id: nom.id, periodo },
      glosa: `Nomina ${periodo} — ${emp.nombre} (${emp.cargo})`,
      lineas: [
        { cuenta: "5105", nombre: cuenta("5105").nombre, tercero: emp.nombre, debito: salario + auxTransporte + aportesPatronales + prestaciones, credito: 0 },
        { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: emp.nombre, debito: 0, credito: neto },
        { cuenta: "2505", nombre: cuenta("2505").nombre, tercero: emp.nombre, debito: 0, credito: deducciones + aportesPatronales },
      ],
    });
    const cb = draft.cajasBancos.find((c) => c.tipo === "banco");
    if (cb) cb.saldo -= neto;
  }
  pushAudit(draft, actor, "Liquidar nomina", `Periodo ${periodo} — ${nominasGen.length} empleado(s)`);
  return { nominas: nominasGen };
}

function simularRespuestaDian(draft, actor, facturaId) {
  const fac = draft.facturas.find((f) => f.id === facturaId);
  if (!fac) return { error: "Factura no encontrada." };
  const r = Math.random();
  fac.estadoDian = r < 0.85 ? "aceptado" : r < 0.95 ? "contingencia" : "rechazado";
  fac.cufe = fac.estadoDian === "aceptado" ? `CUFE-SIM-${Math.random().toString(36).slice(2, 18)}` : null;
  pushAudit(draft, actor, "Simular respuesta DIAN (sandbox)", `${fac.numero}: ${fac.estadoDian} - simulado, sin conexion real a DIAN`);
  return fac;
}

/* ============================================================================
   DATOS DE DEMOSTRACION — Grupo Horizonte S.A.S.
   Se generan reutilizando el motor de reglas de negocio de arriba, "viajando
   en el tiempo" con __clock, para que el historial (cartera, kardex,
   comprobantes) sea perfectamente consistente con lo que el usuario vera si
   repite el mismo flujo manualmente.
   ============================================================================ */

function buildSeed() {
  const draft = {
    empresa: EMPRESA, sedes: SEDES, bodegas: BODEGAS, planCuentas: PLAN_CUENTAS,
    cajasBancos: structuredClone(CAJAS_BANCOS_SEED),
    terceros: structuredClone(TERCEROS_SEED),
    productos: structuredClone(PRODUCTOS_SEED),
    empleados: structuredClone(EMPLEADOS_SEED),
    consecutivos: {},
    cotizaciones: [], pedidos: [], remisiones: [], facturas: [],
    ordenesCompra: [], recepciones: [], facturasCompra: [],
    movimientosInventario: [], movimientosTesoreria: [], comprobantes: [], nominas: [], auditLog: [],
  };
  const sistema = { usuario: "Carga inicial", rol: "superadmin" };
  const at = (iso, fn) => { setClock(iso); fn(); setClock(null); };
  const P = (id, cantidad) => { const prod = draft.productos.find((p) => p.id === id); return { productoId: id, cantidad, precio: prod.precio, ivaPct: prod.iva }; };
  const CU = (id, cantidad, costoUnitario) => ({ productoId: id, cantidad, costoUnitario });

  function flujoVenta({ fechaCot, terceroId, sedeId, bodegaId, items, hasta, montoParcial, anular, motivoAnulacion, fechaRecibo }) {
    let cot, ped, rem, fac;
    at(fechaCot, () => { cot = crearCotizacion(draft, sistema, { terceroId, sedeId, items }); });
    if (hasta === "cotizacion") return { cot };
    at(addDays(fechaCot, 1), () => { aprobarCotizacion(draft, sistema, cot.id); ped = convertirPedido(draft, sistema, cot.id); });
    if (hasta === "pedido") return { cot, ped };
    at(addDays(fechaCot, 2), () => { rem = generarRemision(draft, sistema, ped.id, bodegaId); });
    if (hasta === "remision" || rem?.error) return { cot, ped, rem };
    at(addDays(fechaCot, 2), () => { fac = generarFactura(draft, sistema, rem.id); });
    if (anular) { at(addDays(fechaCot, 3), () => anularFactura(draft, sistema, fac.id, motivoAnulacion)); return { cot, ped, rem, fac }; }
    if (hasta === "pagada") at(fechaRecibo || addDays(fechaCot, 8), () => registrarRecibo(draft, sistema, { facturaId: fac.id, monto: fac.total, medioPago: "Transferencia bancaria", cajaBancoId: "cb-003" }));
    if (hasta === "parcial") at(fechaRecibo || addDays(fechaCot, 10), () => registrarRecibo(draft, sistema, { facturaId: fac.id, monto: montoParcial, medioPago: "Transferencia bancaria", cajaBancoId: "cb-003" }));
    return { cot, ped, rem, fac };
  }

  function flujoCompra({ fechaOC, proveedorId, sedeId, bodegaId, items, hasta, montoParcial, fechaPago }) {
    let oc, rcp, fc;
    at(fechaOC, () => { oc = crearOrdenCompra(draft, sistema, { proveedorId, sedeId, bodegaId, items }); });
    if (hasta === "oc") return { oc };
    at(addDays(fechaOC, 3), () => { rcp = recibirOrdenCompra(draft, sistema, oc.id, items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad }))); });
    if (hasta === "recepcion") return { oc, rcp };
    at(addDays(fechaOC, 3), () => { fc = generarFacturaCompra(draft, sistema, rcp.id); });
    if (hasta === "pagada") at(fechaPago || addDays(fechaOC, 12), () => pagarFacturaCompra(draft, sistema, { facturaCompraId: fc.id, monto: fc.total, cajaBancoId: "cb-003" }));
    if (hasta === "parcial") at(fechaPago || addDays(fechaOC, 15), () => pagarFacturaCompra(draft, sistema, { facturaCompraId: fc.id, monto: montoParcial, cajaBancoId: "cb-003" }));
    return { oc, rcp, fc };
  }

  // --- Apertura contable ---
  at("2026-01-05T09:00:00-05:00", () => {
    crearComprobante(draft, {
      tipo: "Apertura", fecha: todayISO(), origen: { tipo: "apertura" }, glosa: "Saldos iniciales de apertura del ejercicio 2026",
      lineas: [
        { cuenta: "1105", nombre: cuenta("1105").nombre, tercero: "-", debito: 2470000, credito: 0 },
        { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "-", debito: 50750000, credito: 0 },
        { cuenta: "1435", nombre: cuenta("1435").nombre, tercero: "-", debito: 32000000, credito: 0 },
        { cuenta: "3115", nombre: cuenta("3115").nombre, tercero: "-", debito: 0, credito: 85220000 },
      ],
    });
    pushAudit(draft, sistema, "Carga de datos de demostracion", "Saldos de apertura de Grupo Horizonte S.A.S.");
  });

  // --- Compras (reponen inventario a lo largo del semestre) ---
  flujoCompra({ fechaOC: "2026-02-10T10:00:00-05:00", proveedorId: "p-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-001", 100, 40500), CU("prod-002", 250, 7000)], hasta: "pagada" });
  flujoCompra({ fechaOC: "2026-03-15T10:00:00-05:00", proveedorId: "p-002", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-003", 60, 11500), CU("prod-004", 10, 96000)], hasta: "pagada" });
  flujoCompra({ fechaOC: "2026-05-20T10:00:00-05:00", proveedorId: "p-003", sedeId: "sede-med", bodegaId: "bod-med", items: [CU("prod-007", 20, 38000), CU("prod-008", 10, 22000)], hasta: "parcial", montoParcial: 900000 });
  flujoCompra({ fechaOC: "2026-06-25T10:00:00-05:00", proveedorId: "p-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [CU("prod-004", 8, 97500)], hasta: "pendiente" });
  flujoCompra({ fechaOC: "2026-07-18T10:00:00-05:00", proveedorId: "p-001", sedeId: "sede-med", bodegaId: "bod-med", items: [CU("prod-002", 120, 7100)], hasta: "recepcion" });

  // --- Ventas (historial variado: pagadas, parciales, vencidas, anulada, en curso) ---
  flujoVenta({ fechaCot: "2026-02-03T09:15:00-05:00", terceroId: "t-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 60), P("prod-002", 160)], hasta: "pagada", fechaRecibo: "2026-02-21T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-03-10T09:15:00-05:00", terceroId: "t-002", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-005", 500), P("prod-006", 10)], hasta: "pagada", fechaRecibo: "2026-03-29T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-04-02T09:15:00-05:00", terceroId: "t-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-003", 80), P("prod-004", 4)], hasta: "parcial", montoParcial: 800000, fechaRecibo: "2026-04-25T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-05-05T09:15:00-05:00", terceroId: "t-005", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 15), P("prod-007", 10)], hasta: "parcial", montoParcial: 500000, fechaRecibo: "2026-05-28T11:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-03-25T09:15:00-05:00", terceroId: "t-007", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 260), P("prod-005", 900)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-06-01T09:15:00-05:00", terceroId: "t-003", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-008", 2)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-07-20T09:15:00-05:00", terceroId: "t-006", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 10)], hasta: "pagada", fechaRecibo: "2026-07-20T15:00:00-05:00" });
  flujoVenta({ fechaCot: "2026-07-10T09:15:00-05:00", terceroId: "t-008", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-009", 1), P("prod-010", 2)], hasta: "pendiente" });
  flujoVenta({ fechaCot: "2026-06-15T09:15:00-05:00", terceroId: "t-004", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-004", 2)], hasta: "pendiente", anular: true, motivoAnulacion: "Producto facturado por error; el cliente solicito la cancelacion del documento." });
  flujoVenta({ fechaCot: "2026-07-28T14:00:00-05:00", terceroId: "t-001", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-001", 10), P("prod-006", 5)], hasta: "cotizacion" });
  flujoVenta({ fechaCot: "2026-07-25T14:00:00-05:00", terceroId: "t-002", sedeId: "sede-med", bodegaId: "bod-med", items: [P("prod-005", 150)], hasta: "pedido" });
  flujoVenta({ fechaCot: "2026-07-22T14:00:00-05:00", terceroId: "t-005", sedeId: "sede-bog", bodegaId: "bod-bog", items: [P("prod-002", 30), P("prod-003", 20)], hasta: "remision" });

  // --- Gastos operativos mensuales (comprobantes manuales, partida doble) ---
  const mesesGasto = ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31"];
  mesesGasto.forEach((f, idx) => {
    at(`${f}T17:00:00-05:00`, () => {
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Pago arrendamiento oficina Bogota - ${f.slice(0, 7)}`,
        lineas: [{ cuenta: "5120", nombre: cuenta("5120").nombre, tercero: "Arrendador Edificio Centro", debito: 1600000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Arrendador Edificio Centro", debito: 0, credito: 1600000 }],
      });
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Servicios publicos - ${f.slice(0, 7)}`,
        lineas: [{ cuenta: "5135", nombre: cuenta("5135").nombre, tercero: "Empresa de energia y acueducto", debito: 380000 + idx * 8000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Empresa de energia y acueducto", debito: 0, credito: 380000 + idx * 8000 }],
      });
      crearComprobanteManual(draft, sistema, {
        tipo: "Comprobante de egreso", fecha: todayISO(), glosa: `Gastos administrativos y de personal - ${f.slice(0, 7)} (parcial, calculo simplificado)`,
        lineas: [{ cuenta: "5105", nombre: cuenta("5105").nombre, tercero: "Nomina general", debito: 2400000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Nomina general", debito: 0, credito: 2400000 }],
      });
      const cb = draft.cajasBancos.find((c) => c.id === "cb-003");
      if (cb) cb.saldo -= 1600000 + (380000 + idx * 8000) + 2400000;
    });
  });
  at("2026-04-10T10:00:00-05:00", () => {
    crearComprobanteManual(draft, sistema, {
      tipo: "Comprobante de egreso", fecha: todayISO(), glosa: "Honorarios revisoria fiscal - primer trimestre",
      lineas: [{ cuenta: "5110", nombre: cuenta("5110").nombre, tercero: "Estudio Contable Asociados", debito: 1200000, credito: 0 }, { cuenta: "1110", nombre: cuenta("1110").nombre, tercero: "Estudio Contable Asociados", debito: 0, credito: 1200000 }],
    });
    const cb = draft.cajasBancos.find((c) => c.id === "cb-003"); if (cb) cb.saldo -= 1200000;
  });

  // --- Ajustes y transferencias de inventario ---
  at("2026-04-18T16:00:00-05:00", () => { ajusteInventario(draft, sistema, { productoId: "prod-002", bodegaId: "bod-bog", cantidad: 6, tipo: "salida", motivo: "Productos danados en bodega durante traslado interno" }); });
  at("2026-05-02T16:00:00-05:00", () => { transferenciaInventario(draft, sistema, { productoId: "prod-006", origenBodegaId: "bod-bog", destinoBodegaId: "bod-med", cantidad: 15 }); });

  // --- Simulacion de respuestas DIAN (sandbox, no real) sobre algunas facturas ya emitidas ---
  draft.facturas.slice(-6).forEach((f) => { simularRespuestaDian(draft, sistema, f.id); });

  return draft;
}

const SEED = buildSeed();

export { buildSeed, SEED };
