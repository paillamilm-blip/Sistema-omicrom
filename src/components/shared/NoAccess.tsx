import { ShieldOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-omicron-bg text-center">
      <div className="w-16 h-16 rounded-2xl bg-omicron-red/10 border border-omicron-red/30 flex items-center justify-center mb-6">
        <ShieldOff className="w-8 h-8 text-omicron-red" />
      </div>

      <h2 className="text-xl font-bold text-omicron-text mb-2">Sin Acceso a la Red</h2>
      <p className="text-omicron-subtle text-sm leading-relaxed max-w-xs mb-8">
        Tu cuenta no tiene acceso a ninguna Red Ómicron activa.
        Contacta al administrador de tu nodo para obtener acceso.
      </p>

      <div className="w-full max-w-xs bg-omicron-card border border-omicron-border rounded-2xl p-4 mb-6 text-left">
        <p className="text-xs text-omicron-subtle uppercase tracking-wide mb-2">Estado del nodo</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-omicron-red" />
          <span className="text-sm text-omicron-text">Sin red asignada</span>
        </div>
      </div>

      <button
        onClick={() => supabase.auth.signOut()}
        className="text-omicron-subtle text-sm underline underline-offset-2 hover:text-omicron-text transition"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
