import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, comparePassword, generateToken, verifyToken } from "../../server/auth.js";

describe("Auth", () => {
  describe("hashPassword / comparePassword", () => {
    it("hashea y verifica correctamente", () => {
      const hash = hashPassword("mypassword123");
      expect(hash).not.toBe("mypassword123");
      expect(comparePassword("mypassword123", hash)).toBe(true);
      expect(comparePassword("wrong", hash)).toBe(false);
    });

    it("genera hashes diferentes cada vez", () => {
      const h1 = hashPassword("test");
      const h2 = hashPassword("test");
      expect(h1).not.toBe(h2);
    });
  });

  describe("generateToken / verifyToken", () => {
    it("genera y verifica token JWT", () => {
      const user = { id: "usr-1", email: "test@test.com", rol: "admin_empresa", nombre: "Test" };
      const token = generateToken(user);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const decoded = verifyToken(token);
      expect(decoded.email).toBe("test@test.com");
      expect(decoded.rol).toBe("admin_empresa");
      expect(decoded.nombre).toBe("Test");
    });

    it("rechaza token invalido", () => {
      expect(() => verifyToken("bad-token")).toThrow();
    });
  });
});
