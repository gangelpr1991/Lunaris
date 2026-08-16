process.env.JWT_SECRET = "test-secret-key-123";
process.env.JWT_EXPIRES_IN = "1h";
process.env.NODE_ENV = "test";
// Setup para los tests del frontend (Vitest + jsdom + Testing Library).
// A diferencia de backend/tests/setup.js (que define JWT_SECRET y otras
// variables de entorno que solo el servidor necesita), este archivo es
// especifico del frontend: agrega los matchers extendidos de
// @testing-library/jest-dom (toBeInTheDocument(), toHaveTextContent(), etc.)
// que los tests de componentes usan para hacer aserciones legibles sobre
// el DOM renderizado.
import "@testing-library/jest-dom";
 