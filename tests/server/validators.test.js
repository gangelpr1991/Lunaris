import { describe, it, expect } from "vitest";
import { z } from "zod";
import { loginSchema, crearTerceroSchema, crearProductoSchema, crearCotizacionSchema, registrarReciboSchema, comprobanteManualSchema } from "../../server/validators.js";

describe("Validators (Zod)", () => {
  it("loginSchema valida email correcto", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "123456" });
    expect(result.success).toBe(true);
  });

  it("loginSchema rechaza email invalido", () => {
    const result = loginSchema.safeParse({ email: "notanemail", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("loginSchema rechaza password corto", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "123" });
    expect(result.success).toBe(false);
  });

  it("crearTerceroSchema valida datos completos", () => {
    const result = crearTerceroSchema.safeParse({
      tipo: "cliente", tipoDoc: "NIT", numDoc: "900123456",
      nombre: "Empresa SAS", email: "info@empresa.com",
    });
    expect(result.success).toBe(true);
  });

  it("crearTerceroSchema rechaza tipo invalido", () => {
    const result = crearTerceroSchema.safeParse({
      tipo: "invalido", tipoDoc: "CC", numDoc: "123", nombre: "X",
    });
    expect(result.success).toBe(false);
  });

  it("crearTerceroSchema requiere numDoc", () => {
    const result = crearTerceroSchema.safeParse({
      tipo: "cliente", tipoDoc: "CC", nombre: "Sin doc",
    });
    expect(result.success).toBe(false);
  });

  it("crearProductoSchema valida producto", () => {
    const result = crearProductoSchema.safeParse({
      codigo: "P001", nombre: "Producto A", precio: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("crearCotizacionSchema requiere al menos un item", () => {
    const result = crearCotizacionSchema.safeParse({
      terceroId: "t1", sedeId: "sede-1", items: [],
    });
    expect(result.success).toBe(false);
  });

  it("crearCotizacionSchema valida items", () => {
    const result = crearCotizacionSchema.safeParse({
      terceroId: "t1", sedeId: "sede-1",
      items: [{ productoId: "p1", cantidad: 3, precio: 5000 }],
    });
    expect(result.success).toBe(true);
  });

  it("registrarReciboSchema requiere monto positivo", () => {
    const result = registrarReciboSchema.safeParse({
      facturaId: "f1", monto: -500, medioPago: "Efectivo", cajaBancoId: "cb1",
    });
    expect(result.success).toBe(false);
  });

  it("comprobanteManualSchema requiere al menos 2 lineas", () => {
    const result = comprobanteManualSchema.safeParse({
      tipo: "Diario", fecha: "2025-01-01", glosa: "Test",
      lineas: [{ cuenta: "1105", debito: 1000, credito: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("comprobanteManualSchema valida comprobante balanceado", () => {
    const result = comprobanteManualSchema.safeParse({
      tipo: "Diario", fecha: "2025-01-01", glosa: "Test balanceado",
      lineas: [
        { cuenta: "1105", debito: 1000, credito: 0 },
        { cuenta: "4135", debito: 0, credito: 1000 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
