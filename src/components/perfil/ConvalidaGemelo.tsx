// src/components/perfil/ConvalidaGemelo.tsx
// Panel "Convalida tu Gemelo": aporta CV, títulos, años y aportes a la Bóveda.
// Cada dato se convalida y actualiza el perfil COMPARTIDO (useGemeloProfile),
// reflejándose al instante aquí (nodo, reputación, ejes) y en el resto de la
// app que lea la misma fuente.
import { useRef } from 'react';
import {
  BookOpen, Clock, FileText, GraduationCap, RotateCcw, Sparkles, TrendingUp,
} from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { C, FONT, RADIUS } from '../../theme';

const EJES: { key: 'execution' | 'quality' | 'transcendence' | 'foundation'; label: string; color: string }[] = [
  { key: 'execution', label: 'Ejecución', color: '#00F0FF' },
  { key: 'quality', label: 'Calidad', color: '#0a8ba3' },
  { key: 'transcendence', label: 'Trascendencia', color: '#F59E0B' },
  { key: 'foundation', label: 'Fundamento', color: '#39FF14' },
];

export function ConvalidaGemelo() {
  const { profile, actions, tier } = useGemeloProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const cardBtn: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left',
    padding: '12px 13px', borderRadius: RADIUS.lg, cursor: 'pointer',
    border: '1px solid rgba(0,240,255,0.2)', background: 'rgba(0,240,255,0.05)',
    color: '#eaf4ff', transition: 'all .18s',
  };
  const done: React.CSSProperties = { borderColor: 'rgba(57,255,20,0.4)', background: 'rgba(57,255,20,0.06)' };

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(0,240,255,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Sparkles size={16} style={{ color: C.gold }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>
          Convalida tu Gemelo
        </span>
        <button
          onClick={() => { if (confirm('¿Reiniciar tu perfil convalidado?')) actions.reset(); }}
          title="Reiniciar"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 14, cursor: 'pointer', background: 'none', border: `1px solid ${C.redDim}`, color: C.red, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}
        >
          <RotateCcw size={11} /> Reiniciar
        </button>
      </div>
      <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>
        Aporta tus datos reales: se convalidan y elevan tu nodo. Se refleja en toda la app.
      </p>

      {/* Estado del nodo */}
      <div style={{ padding: '12px 14px', borderRadius: RADIUS.lg, background: C.cyanGhost, border: `1px solid ${C.cyanFaint}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: '#eaf4ff' }}>{tier.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.mono, fontSize: 13, color: C.gold }}>
            <TrendingUp size={13} /> {profile.rep}<span style={{ color: C.cyanDim }}>/100</span>
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, margin: '4px 0 6px' }}>
          <span>{Math.round(profile.pe).toLocaleString()} PE{tier.next ? ` / ${tier.next.min.toLocaleString()}` : ''}</span>
          <span>comisión {tier.commission}%</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: C.cyanFaint, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${tier.progress}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.gold})`, boxShadow: '0 0 12px rgba(0,240,255,0.5)', transition: 'width .6s ease' }} />
        </div>
        {/* Ejes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', marginTop: 12 }}>
          {EJES.map((e) => (
            <div key={e.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: C.cyanDim }}>{e.label}</span>
                <span style={{ fontFamily: FONT.mono, color: e.color }}>{Math.round(profile.axes[e.key])}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, profile.axes[e.key])}%`, background: e.color, transition: 'width .5s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ ...cardBtn, ...(profile.cv ? done : {}) }}>
          <input
            ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files && e.target.files[0]) actions.addCV(); e.currentTarget.value = ''; }}
          />
          <FileText size={18} style={{ color: profile.cv ? C.green : C.cyan }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Subir CV</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.gold }}>
            {profile.cv ? '✔ convalidado' : '+200 PE · Ejecución'}
          </span>
        </label>

        <button style={{ ...cardBtn, ...(profile.titles > 0 ? done : {}) }} onClick={() => actions.addTitle()}>
          <GraduationCap size={18} style={{ color: profile.titles > 0 ? C.green : C.cyan }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Validar título</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.gold }}>
            {profile.titles > 0 ? `${profile.titles} validado(s) · +otro` : '+250 PE · Fundamento'}
          </span>
        </button>

        <div style={{ ...cardBtn, ...(profile.years > 0 ? done : {}) }}>
          <Clock size={18} style={{ color: profile.years > 0 ? C.green : C.cyan }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Experiencia</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => actions.removeYear()} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.cyanDim}`, background: 'rgba(0,240,255,0.06)', color: C.cyan, cursor: 'pointer', fontSize: 16 }}>−</button>
            <span style={{ fontWeight: 700, fontSize: 18, minWidth: 44, textAlign: 'center' }}>{profile.years} añ.</span>
            <button onClick={() => actions.addYear()} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.cyanDim}`, background: 'rgba(0,240,255,0.06)', color: C.cyan, cursor: 'pointer', fontSize: 16 }}>+</button>
          </div>
        </div>

        <button style={{ ...cardBtn, ...(profile.vault > 0 ? done : {}) }} onClick={() => actions.addVault()}>
          <BookOpen size={18} style={{ color: profile.vault > 0 ? C.green : C.cyan }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Aporte a la Bóveda</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.gold }}>
            {profile.vault > 0 ? `${profile.vault} aporte(s) · +otro` : '+150 PE · Trascendencia'}
          </span>
        </button>
      </div>
    </div>
  );
}
