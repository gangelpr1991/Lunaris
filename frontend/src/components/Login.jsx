import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Lock, Mail, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password.trim()) {
      setLocalError("Complete todos los campos.");
      return;
    }
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err.message || "Error al iniciar sesion.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 grid place-items-center mb-4 shadow-lg shadow-amber-500/25">
            <span className="text-white font-bold text-2xl" style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em' }}>L</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em' }}>Lunaris</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma administrativa y contable</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesion</h2>

          {(localError || error) && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm mb-4">
              <AlertCircle size={16} />
              <span>{localError || error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electronico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lunaris.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Contrasena</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contrasena"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Lunaris v0.2.0 &middot; Grupo Horizonte S.A.S.
        </p>
      </div>
    </div>
  );
}
