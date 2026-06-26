import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Zap, Shield, ArrowLeft, Mail } from 'lucide-react';

export function AuthOverlay() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });
        if (err) throw err;
        setSuccess('Revisa tu correo para restablecer la contraseña.');
      } else if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        // Auth state change will redirect automatically
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { username, full_name: username } }
        });
        if (err) throw err;
        if (data.user && !data.session) {
          setSuccess('Cuenta creada. Revisa tu correo para confirmar.');
        }
        // If session exists, user is auto-confirmed and will be redirected
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-omicron-bg">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
          <Zap className="w-8 h-8 text-omicron-accent" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-omicron-text tracking-tight">Sistema Ómicron</h1>
          <p className="text-omicron-subtle text-sm mt-1">Capital Intelectual Digital</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-omicron-card border border-omicron-border rounded-2xl p-6 shadow-2xl">
        {/* Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-omicron-surface mb-6 p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-omicron-accent text-white shadow'
                    : 'text-omicron-subtle hover:text-omicron-text'
                }`}
              >
                {m === 'login' ? 'Iniciar Sesion' : 'Registrarse'}
              </button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <button
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            className="flex items-center gap-2 text-omicron-subtle text-sm mb-4 hover:text-omicron-text transition"
          >
            <ArrowLeft size={16} />
            Volver a login
          </button>
        )}


        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Nombre de usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="tu_nodo"
                required
                className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nodo@omicron.io"
              required
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
          </div>


          {mode !== 'forgot' && (
            <div className="relative">
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Contrasena
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="..."
                required
                className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 pr-12 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 bottom-3 text-omicron-subtle hover:text-omicron-text transition"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-omicron-green/10 border border-omicron-green/30 rounded-xl px-4 py-3 text-omicron-green text-sm">
              {success}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-omicron-accent hover:bg-violet-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all active:scale-95 text-sm"
          >
            {loading ? 'Procesando...' : mode === 'login' ? 'Acceder a la Red' : mode === 'register' ? 'Unirse a Omicron' : 'Enviar enlace de recuperacion'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }}
              className="flex items-center justify-center gap-2 text-omicron-subtle text-sm hover:text-omicron-accent transition mx-auto"
            >
              <Mail size={14} />
              Olvidaste tu contrasena?
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 mt-4 justify-center text-omicron-subtle text-xs">
          <Shield size={12} />
          <span>Cifrado E2E · Red segura Ómicron</span>
        </div>
      </div>

      {/* Pioneer badge */}
      <div className="mt-6 flex items-center gap-2 text-omicron-gold text-xs">
        <span className="text-base">🏆</span>
        <span className="font-medium">Etapa Fundacional activa — beneficio Pioneer</span>
      </div>
    </div>
  );
}
