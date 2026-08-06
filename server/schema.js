export const SCHEMA = `
CREATE TABLE IF NOT EXISTS empresa (
  id TEXT PRIMARY KEY, razonSocial TEXT, nit TEXT, responsabilidad TEXT,
  direccion TEXT, telefono TEXT, email TEXT, moneda TEXT, zonaHoraria TEXT
);

CREATE TABLE IF NOT EXISTS sedes (
  id TEXT PRIMARY KEY, nombre TEXT, ciudad TEXT
);

CREATE TABLE IF NOT EXISTS bodegas (
  id TEXT PRIMARY KEY, nombre TEXT, sedeId TEXT REFERENCES sedes(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, nombre TEXT, descripcion TEXT
);

CREATE TABLE IF NOT EXISTS plan_cuentas (
  codigo TEXT PRIMARY KEY, nombre TEXT, clase TEXT, naturaleza TEXT
);

CREATE TABLE IF NOT EXISTS cajas_bancos (
  id TEXT PRIMARY KEY, tipo TEXT, nombre TEXT, sedeId TEXT, saldo REAL
);

CREATE TABLE IF NOT EXISTS terceros (
  id TEXT PRIMARY KEY, tipo TEXT, tipoDoc TEXT, numDoc TEXT, nombre TEXT,
  email TEXT, telefono TEXT, ciudad TEXT, cupoCredito REAL, condicionPagoDias INTEGER,
  listaPrecios TEXT, saldoCartera REAL DEFAULT 0, saldoCxP REAL DEFAULT 0, creadoEn TEXT
);

CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY, codigo TEXT UNIQUE, nombre TEXT, categoria TEXT, unidad TEXT,
  precio REAL, costoPromedio REAL, iva INTEGER DEFAULT 19, tieneLote INTEGER DEFAULT 0, minimo REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producto_stock (
  productoId TEXT, bodegaId TEXT, cantidad REAL DEFAULT 0,
  PRIMARY KEY (productoId, bodegaId), FOREIGN KEY (productoId) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS empleados (
  id TEXT PRIMARY KEY, nombre TEXT, cargo TEXT, areaId TEXT, sedeId TEXT,
  salario REAL, tipoContrato TEXT, fechaIngreso TEXT
);

CREATE TABLE IF NOT EXISTS consecutivos (
  tipo TEXT PRIMARY KEY, valor INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY, numero TEXT, terceroId TEXT, sedeId TEXT, vendedor TEXT,
  fecha TEXT, subtotal REAL, iva REAL, total REAL, estado TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY, numero TEXT, cotizacionId TEXT, terceroId TEXT, sedeId TEXT,
  fecha TEXT, subtotal REAL, iva REAL, total REAL, estado TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS remisiones (
  id TEXT PRIMARY KEY, numero TEXT, pedidoId TEXT, terceroId TEXT, bodegaId TEXT,
  fecha TEXT, items TEXT, estado TEXT
);

CREATE TABLE IF NOT EXISTS facturas (
  id TEXT PRIMARY KEY, numero TEXT, remisionId TEXT, pedidoId TEXT, terceroId TEXT,
  sedeId TEXT, fecha TEXT, vencimiento TEXT, subtotal REAL, iva REAL, total REAL,
  saldo REAL, estado TEXT, estadoDian TEXT, cufe TEXT, motivoAnulacion TEXT,
  items TEXT, pagos TEXT
);

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id TEXT PRIMARY KEY, numero TEXT, proveedorId TEXT, sedeId TEXT, bodegaId TEXT,
  fecha TEXT, total REAL, estado TEXT, recibidoItems TEXT,
  items TEXT
);

CREATE TABLE IF NOT EXISTS recepciones (
  id TEXT PRIMARY KEY, numero TEXT, ocId TEXT, fecha TEXT, items TEXT
);

CREATE TABLE IF NOT EXISTS facturas_compra (
  id TEXT PRIMARY KEY, numero TEXT, recepcionId TEXT, ocId TEXT, proveedorId TEXT,
  fecha TEXT, vencimiento TEXT, subtotal REAL, iva REAL, total REAL, saldo REAL,
  estado TEXT, items TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id TEXT PRIMARY KEY, productoId TEXT, bodegaId TEXT, cantidad REAL,
  tipo TEXT, origen TEXT, fecha TEXT, saldoResultante REAL
);

CREATE TABLE IF NOT EXISTS movimientos_tesoreria (
  id TEXT PRIMARY KEY, cajaBancoId TEXT, tipo TEXT, concepto TEXT, monto REAL, fecha TEXT
);

CREATE TABLE IF NOT EXISTS comprobantes (
  id TEXT PRIMARY KEY, numero TEXT, tipo TEXT, fecha TEXT, origen TEXT,
  glosa TEXT, totalDebito REAL, totalCredito REAL, balanceado INTEGER,
  lineas TEXT
);

CREATE TABLE IF NOT EXISTS nominas (
  id TEXT PRIMARY KEY, periodo TEXT, fecha TEXT, empleadoId TEXT,
  empleadoNombre TEXT, cargo TEXT, salarioBase REAL, auxTransporte REAL,
  deducciones TEXT, deduccionesTotal REAL, netoPagar REAL,
  aportesPatronales TEXT, aportesPatronalesTotal REAL,
  prestaciones TEXT, prestacionesTotal REAL, costoTotalEmpresa REAL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY, fecha TEXT, usuario TEXT, rol TEXT, accion TEXT, detalle TEXT
);
`;
