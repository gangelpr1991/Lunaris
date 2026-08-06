import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, "..", "..", "test_business.db");

const testDb = new Database(TEST_DB_PATH);
testDb.pragma("journal_mode = WAL");
testDb.pragma("foreign_keys = ON");

vi.mock("../../server/db.js", () => ({ default: testDb }));

const { SCHEMA } = await import("../../server/schema.js");
testDb.exec(SCHEMA);

testDb.exec(`
  INSERT OR REPLACE INTO cajasBancos (id, tipo, nombre, sedeId, saldo) VALUES ('cb-test', 'banco', 'Banco Test', 'sede-1', 1000000);
  INSERT OR REPLACE INTO bodegas (id, nombre, sedeId) VALUES ('bod-test', 'Bodega Test', 'sede-1');
  INSERT OR REPLACE INTO productos (id, codigo, nombre, categoria, unidad, precio, costoPromedio, iva, tieneLote, minimo) VALUES ('prod-test', 'P001', 'Producto Test', 'General', 'UND', 10000, 5000, 19, 0, 0);
`);

const business = await import("../../server/business.js");

describe("Business Logic", () => {
  afterAll(() => {
    testDb.close();
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  });

  it("crearTercero crea un cliente", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.crearTercero(actor, {
      tipo: "cliente", tipoDoc: "CC", numDoc: "123-test",
      nombre: "Cliente Test", email: "c@test.com", telefono: "300",
      ciudad: "Bogota", cupoCredito: 500000, condicionPagoDias: 30,
      listaPrecios: "General",
    });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.nombre).toBe("Cliente Test");
    expect(result.tipo).toBe("cliente");
  });

  it("crearTercero rechaza documento duplicado", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.crearTercero(actor, {
      tipo: "cliente", tipoDoc: "CC", numDoc: "123-test",
      nombre: "Duplicado", email: "d@test.com",
    });

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Ya existe");
  });

  it("crearProducto crea un producto", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.crearProducto(actor, {
      codigo: "P-TEST-NEW", nombre: "Nuevo Producto",
      categoria: "General", unidad: "UND",
      precio: 25000, costoPromedio: 12000, iva: 19,
    });

    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.codigo).toBe("P-TEST-NEW");
  });

  it("crearProducto rechaza codigo duplicado", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.crearProducto(actor, {
      codigo: "P-TEST-NEW", nombre: "Duplicado",
    });

    expect(result.error).toBeDefined();
  });

  it("ajusteInventario tipo entrada", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.ajusteInventario(actor, {
      productoId: "prod-test", bodegaId: "bod-test",
      cantidad: 10, tipo: "entrada", motivo: "Compra inicial",
    });

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it("movimientoTesoreria ingreso", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.registrarMovimientoTesoreriaManual(actor, {
      cajaBancoId: "cb-test", tipo: "ingreso", concepto: "Venta",
      monto: 100000, cuentaContrapartida: "4135",
    });

    expect(result.error).toBeUndefined();
    expect(result.numero).toBeDefined();
  });

  it("movimientoTesoreria rechaza monto negativo", () => {
    const actor = { usuario: "Test", rol: "superadmin" };
    const result = business.registrarMovimientoTesoreriaManual(actor, {
      cajaBancoId: "cb-test", tipo: "ingreso", concepto: "Error",
      monto: -100, cuentaContrapartida: "4135",
    });

    expect(result.error).toBeDefined();
  });
});
