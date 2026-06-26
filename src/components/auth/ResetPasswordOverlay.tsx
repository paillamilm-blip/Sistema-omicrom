import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Zap, CheckCircle } from 'lucide-react';

export function ResetPasswordOverlay({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => {
        onDone();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-omicron-bg">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
          <Zap className="w-8 h-8 text-omicron-accent" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-omicron-text tracking-tight">Sistema Ómicron</h1>
          <p className="text-omicron-subtle text-sm mt-1">Nueva contraseña</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-omicron-card border border-omicron-border rounded-2xl p-6 shadow-2xl">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="w-12 h-12 text-omicron-green" />
            <p className="text-omicron-text font-semibold">Contraseña actualizada</p>
            <p className="text-omicron-subtle text-sm">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-omicron-subtle hover:text-omicron-text"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>


            <div>
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Confirmar contraseña
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-omicron-accent hover:bg-omicron-accent/90 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition active:scale-95 mt-2"
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
