import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error.message, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center max-w-md p-8">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-red-500/20 grid place-items-center mb-4">
              <span className="text-red-400 text-2xl font-bold">!</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Error inesperado</h1>
            <p className="text-slate-400 text-sm mb-4">
              Ha ocurrido un error en la aplicacion. Intente recargar la pagina.
            </p>
            <p className="text-slate-600 text-xs mb-6 font-mono bg-slate-800 rounded-lg p-3">
              {this.state.error?.message || "Error desconocido"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-all"
            >
              Recargar aplicacion
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
