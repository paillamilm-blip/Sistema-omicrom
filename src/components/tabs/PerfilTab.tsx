import { useState } from 'react';
import { LogOut, MapPin, Edit3, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp, useGemeloDigital } from '../../store/AppContext';
import { EditProfileModal } from '../perfil/EditProfileModal';
// Ruta ajustada basándose en la estructura confirmada de tu proyecto
import { ProgressRadar } from '../shared/ProgressRadar';

const NODE_COLORS: Record<string, string> = {
  'Nodo Operativo':  'text-red-400 border-red-400/40 bg-red-400/10',
  'Nodo Core':       'text-orange-400 border-orange-400/40 bg-orange-400/10',
  'Nodo Arquitecto': 'text-omicron-green border-omicron-green/40 bg-omicron-green/10',
  'Nodo Fundador':   'text-omicron-cyan border-omicron-cyan/40 bg-omicron-cyan/10',
};

export function PerfilTab() {
  const { profile } = useApp();
  const gemelo = useGemeloDigital();
  const [paused, setPaused] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const nodeColor = NODE_COLORS[profile?.node_type ?? 'Nodo Operativo'] ?? NODE_COLORS['Nodo Operativo'];
  const initials = (profile?.full_name ?? profile?.username ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  async function togglePause() {
    if (!profile) return;
    const next = !paused;
    setPaused(next);
    await supabase.from('user_status').upsert({
      user_id: profile.id,
      is_paused: next,
      availability: next ? 'paused' : 'available',
    }, { onConflict: 'user_id' });
  }


  return (
    <>
      <div className="flex-1 scroll-area bg-omicron-bg pb-4">
        <div className="px-4 pt-5 space-y-4">

          {/* Profile Card */}
          <div className="bg-omicron-card border border-omicron-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-omicron-accent to-omicron-cyan flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {initials}
                </div>
                <div>
                  <h2 className="text-omicron-text font-bold text-lg leading-tight">
                    {profile?.full_name ?? profile?.username ?? 'Usuario'}
                  </h2>
                  <p className="text-omicron-subtle text-sm">@{profile?.username ?? 'nodo'}</p>
                  {profile?.location && (
                    <div className="flex items-center gap-1 mt-1 text-omicron-subtle text-xs">
                      <MapPin size={11} />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowEdit(true)}
                className="p-2 rounded-xl bg-omicron-surface border border-omicron-border text-omicron-subtle hover:text-omicron-accent hover:border-omicron-accent/40 transition"
              >
                <Edit3 size={16} />
              </button>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${nodeColor}`}>
              <Shield size={12} />
              {profile?.node_type ?? 'Nodo Operativo'} · N{profile?.node_level ?? 1}
            </span>

            {profile?.bio && (
              <p className="text-omicron-subtle text-sm mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>


          {/* ✅ Gemelo Digital Real Conectado */}
          {gemelo ? (
            <div className="bg-omicron-card border border-omicron-border rounded-2xl p-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-bold text-omicron-text">Auditoría de Gemelo Digital</h3>
                <p className="text-[10px] text-omicron-subtle">Métricas de eficiencia en tiempo real</p>
              </div>
              <ProgressRadar gemelo={gemelo} size="md" />
            </div>
          ) : (
            <div className="p-4 bg-omicron-card rounded-2xl border border-omicron-border animate-pulse h-64" />
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Tokens" value={(profile?.token_balance ?? 0).toLocaleString()} icon="🪙" />
            <StatCard label="PE Points" value={(profile?.pe_points ?? 0).toLocaleString()} icon="⭐" />
            <StatCard label="Pioneer" value={profile?.is_pioneer ? 'Activo' : 'No'} icon="🏆" highlight={profile?.is_pioneer} />
          </div>

          {/* Availability Toggle */}
          <div className="bg-omicron-card border border-omicron-border rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-omicron-text text-sm font-semibold">Modo Pausa</p>
                <p className="text-omicron-subtle text-xs mt-0.5">Suspende tu disponibilidad</p>
              </div>
              <button
                onClick={togglePause}
                className={`w-12 h-6 rounded-full transition-all relative ${paused ? 'bg-omicron-accent' : 'bg-omicron-muted'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${paused ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>


          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 bg-omicron-card border border-omicron-border rounded-2xl py-3.5 text-omicron-subtle hover:text-omicron-red hover:border-omicron-red/40 transition active:scale-95"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`bg-omicron-card border ${highlight ? 'border-omicron-gold/40' : 'border-omicron-border'} rounded-2xl p-3 flex flex-col items-center gap-1`}>
      <span className="text-xl">{icon}</span>
      <p className={`font-bold text-base ${highlight ? 'text-omicron-gold' : 'text-omicron-text'}`}>{value}</p>
      <p className="text-omicron-subtle text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
