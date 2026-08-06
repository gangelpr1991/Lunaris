import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import ErrorBoundary from "../../src/components/ErrorBoundary.jsx";

function BrokenComponent() {
  throw new Error("Simulated render error");
}

describe("ErrorBoundary", () => {
  it("renderiza contenido normal sin errores", () => {
    const { container } = render(
      React.createElement(ErrorBoundary, null,
        React.createElement("div", { "data-testid": "ok" }, "Todo bien")
      )
    );
    expect(container.innerHTML).toContain("Todo bien");
  });

  it("captura errores y muestra pantalla de error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      React.createElement(ErrorBoundary, null,
        React.createElement(BrokenComponent)
      )
    );
    expect(container.innerHTML).toContain("Error inesperado");
    expect(container.innerHTML).toContain("Simulated render error");
    spy.mockRestore();
  });
});
