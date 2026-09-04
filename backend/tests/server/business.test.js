import { describe, it, expect, beforeAll } from 'vitest';
import business from '../../server/business.js';
import db from '../../server/db.js';
import { runMigrations } from '../../server/migrations.js';

// Estos tests corren contra una base Postgres REAL (lunaris_test_mt via
// .env.test, ver tests/setup.js) - la version anterior de este archivo
// simulaba ../../server/db.js como si fuera una base SQLite directa
// (better-sqlite3 con .prepare()), lo cual dejo de ser cierto desde que el
// proyecto migro a Postgres. Cada test usa un sufijo unico (Date.now() +
// un contador) en los campos con restriccion de unicidad (numDoc, codigo)
// para poder correr el archivo varias veces sin chocar con datos de una
// corrida anterior.

let contador = 0;
function unico(prefijo) {
  contador++;
  return `${prefijo}-${Date.now()}-${contador}`;
}

// Desde la migracion 002 (multi-tenancy + RLS), toda tabla de negocio
// exige un tenantId real que referencie una fila de "tenants" - sin esto,
// cada INSERT de este archivo violaria la FK/NOT NULL de "tenantId". El
// tenant se crea una sola vez en beforeAll y se reusa en todos los tests.
const TEST_TENANT_ID = 'tnt-test-' + Date.now();
const actor = { usuario: 'test', rol: 'admin', tenantId: TEST_TENANT_ID };

beforeAll(async () => {
  await db.initDB();
  await runMigrations();
  await db.query(
    'INSERT INTO tenants (id, slug, nombre, activo, created_at) VALUES ($1,$2,$3,$4,$5)',
    [TEST_TENANT_ID, unico('test-tenant'), 'Empresa de pruebas (business.test.js)', 1, new Date().toISOString()]
  );
});

describe('Business Logic - Terceros y Productos', () => {
  it('crearTercero crea un cliente', async () => {
    const result = await business.crearTercero(actor, {
      tipo: 'cliente',
      tipoDoc: 'CC',
      numDoc: unico('doc'),
      nombre: 'Cliente Test',
      condicionPagoDias: 30,
    });
    expect(result.error).toBeUndefined();
    expect(result.id).toBeTruthy();
    expect(result.saldoCartera).toBe(0);
  });

  it('crearTercero rechaza documento duplicado', async () => {
    const numDoc = unico('doc');
    await business.crearTercero(actor, {
      tipo: 'cliente',
      tipoDoc: 'CC',
      numDoc,
      nombre: 'Original',
    });
    const result = await business.crearTercero(actor, {
      tipo: 'cliente',
      tipoDoc: 'CC',
      numDoc,
      nombre: 'Duplicado',
    });
    expect(result.error).toBeTruthy();
  });

  it('crearProducto crea un producto', async () => {
    const result = await business.crearProducto(actor, {
      codigo: unico('PROD'),
      nombre: 'Producto Test',
      categoria: 'General',
      unidad: 'und',
      precio: 10000,
      costoPromedio: 6000,
      iva: 19,
    });
    expect(result.error).toBeUndefined();
    expect(result.id).toBeTruthy();
  });

  it('crearProducto rechaza codigo duplicado', async () => {
    const codigo = unico('PROD');
    await business.crearProducto(actor, {
      codigo,
      nombre: 'Original',
      categoria: 'General',
      unidad: 'und',
    });
    const result = await business.crearProducto(actor, {
      codigo,
      nombre: 'Duplicado',
      categoria: 'General',
      unidad: 'und',
    });
    expect(result.error).toBeTruthy();
  });
});

describe('Business Logic - Inventario', () => {
  it('ajusteInventario tipo entrada mete stock correctamente', async () => {
    const sede = await business.createSede({
      nombre: unico('Sede'),
      ciudad: 'Bogota',
      tenantId: TEST_TENANT_ID,
    });
    const bodega = await business.createBodega({
      nombre: unico('Bodega'),
      sedeId: sede.id,
      tenantId: TEST_TENANT_ID,
    });
    const producto = await business.crearProducto(actor, {
      codigo: unico('PROD'),
      nombre: 'Producto',
      categoria: 'General',
      unidad: 'und',
    });

    const result = await business.ajusteInventario(actor, {
      productoId: producto.id,
      bodegaId: bodega.id,
      cantidad: 50,
      tipo: 'entrada',
      motivo: 'Test',
    });
    expect(result.error).toBeUndefined();

    const stock = await business.getStock(producto.id, bodega.id);
    expect(stock).toBe(50);
  });
});

describe('Business Logic - Tesoreria', () => {
  it('registrarMovimientoTesoreriaManual tipo ingreso suma el saldo', async () => {
    const sede = await business.createSede({
      nombre: unico('Sede'),
      ciudad: 'Bogota',
      tenantId: TEST_TENANT_ID,
    });
    const cb = await db.insert('cajasBancos', {
      id: unico('cb'),
      tipo: 'banco',
      nombre: 'Banco Test',
      sedeId: sede.id,
      saldo: 0,
      tenantId: TEST_TENANT_ID,
    });

    const result = await business.registrarMovimientoTesoreriaManual(actor, {
      cajaBancoId: cb.id,
      tipo: 'ingreso',
      concepto: 'Test ingreso',
      monto: 100000,
      cuentaContrapartida: '4135',
    });
    expect(result.error).toBeUndefined();

    const cbActualizada = await db.queryOne(
      'SELECT saldo FROM cajasBancos WHERE id = $1',
      [cb.id]
    );
    expect(Number(cbActualizada.saldo)).toBe(100000);
  });

  it('registrarMovimientoTesoreriaManual rechaza monto negativo o cero', async () => {
    const sede = await business.createSede({
      nombre: unico('Sede'),
      ciudad: 'Bogota',
      tenantId: TEST_TENANT_ID,
    });
    const cb = await db.insert('cajasBancos', {
      id: unico('cb'),
      tipo: 'banco',
      nombre: 'Banco Test',
      sedeId: sede.id,
      saldo: 0,
      tenantId: TEST_TENANT_ID,
    });

    const result = await business.registrarMovimientoTesoreriaManual(actor, {
      cajaBancoId: cb.id,
      tipo: 'ingreso',
      concepto: 'Test',
      monto: -500,
      cuentaContrapartida: '4135',
    });
    expect(result.error).toBeTruthy();
  });
});

describe('Business Logic - Ciclo completo de venta', () => {
  it('cotizar -> aprobar -> pedido -> remision -> factura -> pago, con contabilidad cuadrada', async () => {
    const sede = await business.createSede({
      nombre: unico('Sede'),
      ciudad: 'Bogota',
      tenantId: TEST_TENANT_ID,
    });
    const bodega = await business.createBodega({
      nombre: unico('Bodega'),
      sedeId: sede.id,
      tenantId: TEST_TENANT_ID,
    });
    const cliente = await business.crearTercero(actor, {
      tipo: 'cliente',
      tipoDoc: 'CC',
      numDoc: unico('doc'),
      nombre: 'Cliente Venta',
      condicionPagoDias: 30,
    });
    const producto = await business.crearProducto(actor, {
      codigo: unico('PROD'),
      nombre: 'Producto Venta',
      categoria: 'General',
      unidad: 'und',
      precio: 50000,
      costoPromedio: 30000,
      iva: 19,
    });
    await business.ajusteInventario(actor, {
      productoId: producto.id,
      bodegaId: bodega.id,
      cantidad: 100,
      tipo: 'entrada',
      motivo: 'Inicial',
    });

    const cot = await business.crearCotizacion(actor, {
      terceroId: cliente.id,
      sedeId: sede.id,
      items: [
        { productoId: producto.id, cantidad: 10, precio: 50000, ivaPct: 19 },
      ],
    });
    expect(cot.error).toBeUndefined();
    expect(cot.total).toBe(595000);

    // aprobarCotizacion / convertirPedido reciben { id }, no un string suelto -
    // asi es exactamente como el dispatcher /api/accion en index.js los llama
    // desde el frontend real (ACTIONS.APROBAR_COTIZACION: (actor, p) =>
    // business.aprobarCotizacion(actor, p.id)) - probar con la firma real, no
    // con un atajo directo, es lo que hizo que se detectara este bug.
    const aprob = await business.aprobarCotizacion(actor, { id: cot.id });
    expect(aprob.error).toBeUndefined();

    const ped = await business.convertirPedido(actor, { id: cot.id });
    expect(ped.error).toBeUndefined();

    const rem = await business.generarRemision(actor, {
      pedidoId: ped.id,
      bodegaId: bodega.id,
    });
    expect(rem.error).toBeUndefined();

    const stockTrasRemision = await business.getStock(producto.id, bodega.id);
    expect(stockTrasRemision).toBe(90);

    const fac = await business.generarFactura(actor, { remisionId: rem.id });
    expect(fac.error).toBeUndefined();
    expect(fac.saldo).toBe(595000);

    const comprobantes = await db.query(
      'SELECT * FROM comprobantes WHERE origen LIKE $1',
      [`%"id":"${fac.id}"%`]
    );
    const compVenta = comprobantes.find((c) => c.tipo === 'Factura de venta');
    expect(compVenta.balanceado).toBe(1);

    const cb = await db.insert('cajasBancos', {
      id: unico('cb'),
      tipo: 'banco',
      nombre: 'Banco Test',
      sedeId: sede.id,
      saldo: 0,
      tenantId: TEST_TENANT_ID,
    });
    const recibo = await business.registrarRecibo(actor, {
      facturaId: fac.id,
      monto: 595000,
      medioPago: 'transferencia',
      cajaBancoId: cb.id,
      fecha: new Date().toISOString(),
    });
    expect(recibo.error).toBeUndefined();

    const facFinal = await business.getFactura(fac.id);
    expect(facFinal.saldo).toBe(0);
    expect(facFinal.estado).toBe('pagada');
  });

  it('un sobrepago se rechaza en vez de aceptarse', async () => {
    const sede = await business.createSede({
      nombre: unico('Sede'),
      ciudad: 'Bogota',
      tenantId: TEST_TENANT_ID,
    });
    const bodega = await business.createBodega({
      nombre: unico('Bodega'),
      sedeId: sede.id,
      tenantId: TEST_TENANT_ID,
    });
    const cliente = await business.crearTercero(actor, {
      tipo: 'cliente',
      tipoDoc: 'CC',
      numDoc: unico('doc'),
      nombre: 'Cliente Sobrepago',
    });
    const producto = await business.crearProducto(actor, {
      codigo: unico('PROD'),
      nombre: 'Producto',
      categoria: 'General',
      unidad: 'und',
      precio: 10000,
      costoPromedio: 6000,
    });
    await business.ajusteInventario(actor, {
      productoId: producto.id,
      bodegaId: bodega.id,
      cantidad: 10,
      tipo: 'entrada',
      motivo: 'Inicial',
    });

    const cot = await business.crearCotizacion(actor, {
      terceroId: cliente.id,
      sedeId: sede.id,
      items: [
        { productoId: producto.id, cantidad: 1, precio: 10000, ivaPct: 19 },
      ],
    });
    const aprob = await business.aprobarCotizacion(actor, { id: cot.id });
    expect(aprob.error).toBeUndefined();
    const ped = await business.convertirPedido(actor, { id: cot.id });
    expect(ped.error).toBeUndefined();
    const rem = await business.generarRemision(actor, {
      pedidoId: ped.id,
      bodegaId: bodega.id,
    });
    expect(rem.error).toBeUndefined();
    const fac = await business.generarFactura(actor, { remisionId: rem.id });
    expect(fac.error).toBeUndefined();

    const cb = await db.insert('cajasBancos', {
      id: unico('cb'),
      tipo: 'banco',
      nombre: 'Banco',
      sedeId: sede.id,
      saldo: 0,
      tenantId: TEST_TENANT_ID,
    });
    const sobrepago = await business.registrarRecibo(actor, {
      facturaId: fac.id,
      monto: fac.saldo + 999999,
      medioPago: 'efectivo',
      cajaBancoId: cb.id,
      fecha: new Date().toISOString(),
    });
    expect(sobrepago.error).toBeTruthy();
    // Con este chequeo confirmamos que rechaza por la razon CORRECTA (monto
    // mayor al saldo), no por cualquier otro error silencioso mas arriba en
    // la cadena - el bug anterior en este mismo archivo (llamar aprobarCotizacion
    // con un string en vez de {id}) hacia que este test "pasara" por la razon
    // equivocada, sin probar de verdad el sobrepago.
    expect(sobrepago.error).toMatch(/saldo pendiente/i);
  });
});

describe('Business Logic - Multi-tenancy (aislamiento entre empresas)', () => {
  it('un tenant no ve ni puede tocar los terceros de otro tenant', async () => {
    const otroTenantId = 'tnt-test-otro-' + Date.now();
    await db.query(
      'INSERT INTO tenants (id, slug, nombre, activo, created_at) VALUES ($1,$2,$3,$4,$5)',
      [otroTenantId, unico('otro-tenant'), 'Otra empresa (aislamiento)', 1, new Date().toISOString()]
    );
    const actorOtro = { usuario: 'test-otro', rol: 'admin', tenantId: otroTenantId };

    const numDoc = unico('doc');
    const propio = await business.crearTercero(actor, {
      tipo: 'cliente', tipoDoc: 'CC', numDoc, nombre: 'Cliente tenant A',
    });
    expect(propio.error).toBeUndefined();

    // Mismo numDoc en el otro tenant: no debe chocar con la unicidad
    // (la unicidad de terceros es solo app-level via SELECT, y RLS acota
    // ese SELECT al tenant activo) - si esto fallara con "ya existe",
    // significaria que el SELECT de duplicados esta viendo filas de otro
    // tenant, es decir que el aislamiento no esta funcionando.
    const enOtro = await business.crearTercero(actorOtro, {
      tipo: 'cliente', tipoDoc: 'CC', numDoc, nombre: 'Cliente tenant B',
    });
    expect(enOtro.error).toBeUndefined();
    expect(enOtro.id).not.toBe(propio.id);

    // El tenant B no debe poder leer (via SELECT directo bajo su propio
    // contexto de sesion) la fila del tenant A - RLS debe filtrarla.
    const fugaDesdeB = await db.transaction(async (tx) => {
      return await tx.queryOne('SELECT id FROM terceros WHERE id = $1', [propio.id]);
    }, otroTenantId);
    expect(fugaDesdeB).toBeNull();

    // Y el tenant A si debe poder ver la suya.
    const propioDesdeA = await db.transaction(async (tx) => {
      return await tx.queryOne('SELECT id FROM terceros WHERE id = $1', [propio.id]);
    }, TEST_TENANT_ID);
    expect(propioDesdeA?.id).toBe(propio.id);
  });

  it('db.loadFullState/saveFullState (usados por GET/PUT /api/estado) acotan por tenantId', async () => {
    // Este test existe porque el bug real que detecto ese acotamiento no
    // estaba en pgdb.js (donde se implementa) sino en db.js, que reexporta
    // loadFullState/saveFullState con una firma vieja sin el parametro
    // tenantId y lo descartaba en silencio - solo se detecto probando el
    // endpoint HTTP real con curl, no con este archivo. Sin un tenantId
    // real, ambas funciones deben rechazar explicitamente (nunca devolver
    // datos de todos los tenants mezclados ni reventar con un error de
    // Postgres confuso).
    await expect(db.loadFullState()).rejects.toThrow(/tenantId/);
    await expect(db.saveFullState({}, undefined)).rejects.toThrow(/tenantId/);

    const estado = await db.loadFullState(TEST_TENANT_ID);
    expect(Array.isArray(estado.terceros)).toBe(true);

    const otroTenantId = 'tnt-test-loadstate-' + Date.now();
    await db.query(
      'INSERT INTO tenants (id, slug, nombre, activo, created_at) VALUES ($1,$2,$3,$4,$5)',
      [otroTenantId, unico('otro-loadstate'), 'Otra empresa (loadFullState)', 1, new Date().toISOString()]
    );
    const estadoOtro = await db.loadFullState(otroTenantId);
    const numDocsDelPrimero = estado.terceros.map((t) => t.numDoc);
    const hayFuga = estadoOtro.terceros.some((t) => numDocsDelPrimero.includes(t.numDoc));
    expect(hayFuga).toBe(false);
  });

  it('crearTenant aprovisiona una empresa nueva con su admin y datos minimos', async () => {
    const slug = unico('empresa-nueva');
    const resultado = await business.crearTenant({ usuario: 'superadmin-test', rol: 'superadmin' }, {
      nombre: 'Empresa Nueva de Prueba',
      slug,
      adminNombre: 'Admin Nueva Empresa',
      adminEmail: `admin-${slug}@lunaris-test.com`,
      adminPassword: 'clave12345',
    });
    expect(resultado.error).toBeUndefined();
    expect(resultado.tenantId).toBeTruthy();

    const usuario = await db.queryOne('SELECT * FROM usuarios WHERE email = $1', [resultado.adminEmail]);
    expect(usuario.rol).toBe('admin_empresa');
    expect(usuario.tenantId).toBe(resultado.tenantId);

    const cuentas = await db.transaction(async (tx) => {
      return await tx.query('SELECT codigo FROM plancuentas');
    }, resultado.tenantId);
    expect(cuentas.length).toBeGreaterThan(0);
  });
});
