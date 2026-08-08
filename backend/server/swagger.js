import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lunaris API",
      version: "0.2.0",
      description: "API REST de la plataforma administrativa y contable Lunaris para empresas colombianas.",
      contact: {
        name: "Lunaris - Grupo Horizonte S.A.S.",
      },
    },
    servers: [
      { url: "http://localhost:3001", description: "Desarrollo local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@lunaris.com" },
            password: { type: "string", format: "password", minLength: 6, example: "Admin123!" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            token: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                nombre: { type: "string" },
                rol: { type: "string" },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: false },
            error: { type: "string", example: "Mensaje de error" },
          },
        },
        Tercero: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["cliente", "proveedor"] },
            tipoDoc: { type: "string" },
            numDoc: { type: "string" },
            nombre: { type: "string" },
            email: { type: "string" },
            telefono: { type: "string" },
            ciudad: { type: "string" },
            cupoCredito: { type: "number" },
            condicionPagoDias: { type: "number" },
            listaPrecios: { type: "string" },
          },
        },
        Producto: {
          type: "object",
          properties: {
            codigo: { type: "string" },
            nombre: { type: "string" },
            categoria: { type: "string" },
            unidad: { type: "string" },
            precio: { type: "number" },
            costoPromedio: { type: "number" },
            iva: { type: "number" },
            tieneLote: { type: "boolean" },
            minimo: { type: "number" },
          },
        },
        AccionRequest: {
          type: "object",
          required: ["type", "payload"],
          properties: {
            type: { type: "string", description: "Tipo de accion de negocio" },
            payload: { type: "object", description: "Datos de la accion" },
          },
        },
        AccionResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            result: { type: "object" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Autenticacion y autorizacion" },
      { name: "Estado", description: "Estado completo del sistema" },
      { name: "Negocio", description: "Acciones de logica de negocio (20 operaciones)" },
      { name: "Salud", description: "Health check" },
    ],
  },
  apis: ["./server/index.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
