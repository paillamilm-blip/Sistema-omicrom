// src/components/empleos/TrabajoTeEncuentra.tsx
// "El trabajo te encuentra": Ómicron analiza tu Gemelo (perfil COMPARTIDO),
// calcula la afinidad de cada oportunidad, y con un clic ("Sí, me interesa")
// postula por ti, prepara la propuesta y te entrena para la entrevista
// (con voz: leer la pregunta + practicar tu respuesta).
import { useState, useEffect, useRef } from 'react';
import { Target, Radar, X, Check, Volume2, Mic } from 'lucide-react';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { C, FONT, RADIUS } from '../../theme';

type Eje = 'execution' | 'quality' | 'transcendence' | 'foundation';
interface JobDef { title: string; company: string; salary: string; mode: string; tags: string[]; minPe: number; bias: number; eje: Eje; }

const JOBS: JobDef[] = [
  { title: 'Frontend Senior · React', company: 'Nébula Labs', salary: '$3.200–4.000', mode: 'Remoto', tags: ['React', 'UX', 'TypeScript'], minPe: 500, bias: 9, eje: 'execution' },
  { title: 'Product Designer', company: 'Aurora Studio', salary: '$2.800–3.600', mode: 'Remoto', tags: ['UX', 'Figma'], minPe: 300, bias: 6, eje: 'quality' },
  { title: 'Full-Stack Developer', company: 'Vortex', salary: '$3.000–3.800', mode: 'Remoto', tags: ['Node', 'React', 'SQL'], minPe: 600, bias: 5, eje: 'execution' },
  { title: 'Tech Lead', company: 'Helix', salary: '$5.000–6.500', mode: 'Híbrido', tags: ['Liderazgo', 'Arquitectura'], minPe: 1500, bias: 1, eje: 'foundation' },
  { title: 'Mentor / Formador', company: 'Academia Ómicron', salary: '$2.000 + tokens', mode: 'Remoto', tags: ['Mentoría', 'Bóveda'], minPe: 200, bias: 8, eje: 'transcendence' },
];
const STAGES = ['Enviada', 'En revisión', 'Entrevista', 'Oferta'];
const IQ = [
  { q: 'Cuéntame de un proyecto del que estés orgulloso y tu rol.', tip: 'Usa STAR: Situación, Tarea, Acción, Resultado. Cierra con un dato concreto.' },
  { q: '¿Cómo aseguras la calidad de tu trabajo bajo presión?', tip: 'Habla de pruebas, revisión de pares y priorización. Conecta con tu eje de Calidad validado.' },
  { q: '¿Por qué tú y no otro candidato?', tip: 'Apóyate en tu Pasaporte verificable: reputación y credenciales que otros no pueden demostrar.' },
];

interface AppRec { title: string; company: string; fit: number; ts: number; }
const APP_KEY = 'omicron_apps';
function loadApps(): AppRec[] { try { return JSON.parse(localStorage.getItem(APP_KEY) || '[]') as AppRec[]; } catch { return []; } }

function FitRing({ pct, color }: { pct: number; color: string }) {
  const r = 24, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <span style={{ position: 'relative', width: 56, height: 56, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#12203a" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <span style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, color }}>{pct}</span>
    </span>
  );
}

export function TrabajoTeEncuentra() {
  const { profile, tier } = useGemeloProfile();
  const [apps, setApps] = useState<AppRec[]>(loadApps);
  const [flowJob, setFlowJob] = useState<JobDef | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 5000); return () => clearInterval(t); }, []);

  const fit = (j: JobDef) => {
    let f = 48 + Math.round(profile.rep * 0.42) + (profile.pe >= j.minPe ? 12 : -12) + (profile.cv ? 4 : 0)
      + Math.min(9, profile.titles * 3) + Math.round(((profile.axes[j.eje] || 0) - 40) * 0.12) + j.bias;
    return Math.max(34, Math.min(99, f));
  };
  const scored = JOBS.map((j) => ({ j, f: fit(j) })).sort((a, b) => b.f - a.f);

  const registerApply = (j: JobDef) => {
    setApps((prev) => {
      if (prev.some((a) => a.title === j.title)) return prev;
      const nx = [...prev, { title: j.title, company: j.company, fit: fit(j), ts: Date.now() }].slice(-12);
      try { localStorage.setItem(APP_KEY, JSON.stringify(nx)); } catch { /* noop */ }
      return nx;
    });
  };
  const stageOf = (a: AppRec) => Math.min(STAGES.length - 1, Math.floor((Date.now() - a.ts) / 20000));
  const tierName = tier.name.replace('Nodo ', '');

  return (
    <div style={{ borderRadius: RADIUS.xl, padding: 16, marginBottom: 14, background: 'rgba(12,20,38,0.95)', border: `1px solid ${C.cyanDim}` }}>
      {/* Scanner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative', width: 42, height: 42, borderRadius: '50%', border: `1px solid ${C.cyanDim}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Radar size={20} style={{ color: C.cyan }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>El trabajo te encuentra</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, marginTop: 1 }}>
            Ómicron postula por ti · Nodo {tierName} · rep {profile.rep}
          </div>
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.green, letterSpacing: 1 }}>24/7</span>
      </div>

      {/* Postulaciones activas */}
      {apps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>
            ● Ómicron gestiona {apps.length} proceso(s) por ti
          </div>
          {apps.slice().reverse().map((a, i) => {
            const s = stageOf(a), pct = Math.round(((s + 1) / STAGES.length) * 100);
            return (
              <div key={`${a.title}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: RADIUS.lg, background: 'rgba(57,255,20,0.05)', border: '1px solid rgba(57,255,20,0.18)', marginBottom: 7 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#eaf4ff' }}>{a.title}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.cyanDim }}>{a.company} · match {a.fit}%</div>
                </div>
                <div style={{ width: 78, flexShrink: 0 }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: C.green, textAlign: 'right', textTransform: 'uppercase' }}>{STAGES[s]}</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`, transition: 'width .6s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feed de oportunidades */}
      <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 1, color: C.cyanDim, textTransform: 'uppercase', marginBottom: 10 }}>
        Oportunidades que te calzan
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {scored.slice(0, 4).map(({ j, f }, i) => {
          const col = f >= 85 ? C.green : f >= 70 ? C.cyan : C.gold;
          const done = apps.some((a) => a.title === j.title);
          const top = i === 0 && f >= 75;
          return (
            <div key={j.title} style={{ position: 'relative', padding: 14, borderRadius: RADIUS.lg, background: 'rgba(6,12,26,0.6)', border: `1px solid ${top ? C.goldDim : 'rgba(255,255,255,0.1)'}`, opacity: done ? 0.6 : 1 }}>
              {top && <span style={{ position: 'absolute', top: -9, left: 12, fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 8, background: C.gold, color: '#04121f', fontWeight: 700 }}>★ Mejor match</span>}
              <div style={{ display: 'flex', gap: 12 }}>
                <FitRing pct={f} color={col} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: '#eaf4ff', lineHeight: 1.15 }}>{j.title}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.cyanDim, marginTop: 2 }}>{j.company} · {j.mode}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9.5, padding: '3px 8px', borderRadius: 10, color: C.green, border: '1px solid rgba(57,255,20,0.3)' }}>{j.salary}</span>
                    {j.tags.map((t) => <span key={t} style={{ fontFamily: FONT.mono, fontSize: 9.5, padding: '3px 8px', borderRadius: 10, color: '#cfe', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>)}
                  </div>
                </div>
              </div>
              {done ? (
                <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.green, marginTop: 10 }}>✓ Ómicron está postulando por ti</div>
              ) : (
                <button onClick={() => setFlowJob(j)} style={{ width: '100%', marginTop: 11, padding: 11, borderRadius: RADIUS.lg, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, #7df9ff, ${C.cyan})`, color: '#04121f', fontFamily: FONT.mono, fontSize: 11, letterSpacing: .5, textTransform: 'uppercase', fontWeight: 700 }}>
                  ✓ Sí, me interesa
                </button>
              )}
            </div>
          );
        })}
      </div>

      {flowJob && (
        <AutoApply
          job={flowJob}
          fit={fit(flowJob)}
          repText={`Nodo ${tierName}, reputación ${profile.rep} y ${Math.round(profile.pe).toLocaleString()} PE`}
          onApplied={() => registerApply(flowJob)}
          onClose={() => setFlowJob(null)}
        />
      )}
    </div>
  );
}

function AutoApply({ job, fit, repText, onApplied, onClose }: {
  job: JobDef; fit: number; repText: string; onApplied: () => void; onClose: () => void;
}) {
  const [step, setStep] = useState(0); // 0 enviando, 1 propuesta, 2 entrevista, 3 listo
  const [fb, setFb] = useState<Record<number, string>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.push(window.setTimeout(() => setStep(1), 1400));
    timers.current.push(window.setTimeout(() => setStep(2), 3000));
    timers.current.push(window.setTimeout(() => { setStep(3); onApplied(); }, 4600));
    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (t: string) => { try { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; u.rate = 1.02; speechSynthesis.speak(u); } catch { /* noop */ } };
  const practice = (idx: number) => {
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown });
    const Rec = (SR.SpeechRecognition || SR.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
    if (!Rec) { setFb((p) => ({ ...p, [idx]: '🎙️ Micrófono no disponible aquí. En producción practicas por voz.' })); return; }
    setFb((p) => ({ ...p, [idx]: '🎙️ Escuchando… responde en voz alta' }));
    try {
      const r = new Rec(); r.lang = 'es-ES'; r.interimResults = false;
      r.onresult = (e: SpeechResultLike) => {
        const t = (e.results[0][0].transcript || '').trim();
        const w = t ? t.split(/\s+/).length : 0;
        const m = w < 12 ? 'Amplía con un ejemplo concreto (STAR).' : w > 60 ? 'Muy completo: sintetiza la idea clave al final.' : 'Buen largo: cierra con un resultado medible.';
        setFb((p) => ({ ...p, [idx]: `✓ Respondiste (${w} palabras). ${m}` }));
      };
      r.onerror = () => setFb((p) => ({ ...p, [idx]: 'No pude escuchar (permiso de micrófono).' }));
      r.start();
    } catch { setFb((p) => ({ ...p, [idx]: 'No pude iniciar el micrófono.' })); }
  };

  const steps = ['Enviando tu candidatura a ' + job.company, 'Preparando tu propuesta', 'Entrenándote para la entrevista', 'Postulación enviada'];

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(1,4,13,0.85)', backdropFilter: 'blur(7px)' }}>
      <div style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', background: 'rgba(8,14,28,0.98)', border: `1px solid ${C.cyanDim}`, borderRadius: '20px 20px 0 0', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Target size={16} style={{ color: C.gold }} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: '#eaf4ff' }}>Postulando por ti</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.cyanDim, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, textTransform: 'uppercase', marginBottom: 16 }}>{job.title} · {job.company}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((h, i) => {
            const active = i === step, doneS = i < step;
            return (
              <div key={i} style={{ display: 'flex', gap: 12, opacity: active || doneS ? 1 : 0.4 }}>
                <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: doneS ? C.green : active ? 'rgba(0,214,230,0.15)' : 'rgba(255,255,255,0.08)', color: doneS ? '#04121f' : active ? C.cyan : C.cyanDim, border: active ? `1px solid ${C.cyan}` : 'none', fontFamily: FONT.mono, fontSize: 12 }}>
                  {doneS ? <Check size={15} /> : i === 3 ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1, paddingTop: 3 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>{h}</div>
                  {i === 0 && (active || doneS) && <div style={{ fontSize: 12, color: C.cyanDim, marginTop: 3, lineHeight: 1.4 }}>Adjunté tu Pasaporte verificable ({repText}). Sin formularios: tus datos ya están validados.</div>}
                  {i === 1 && (active || doneS) && (
                    <div style={{ marginTop: 8, padding: '11px 13px', borderRadius: 10, background: 'rgba(0,214,230,0.05)', border: `1px solid ${C.cyanFaint}`, fontSize: 12, lineHeight: 1.5, color: '#dbeafe' }}>
                      "Candidato {repText}. Encaje con {job.title}: {fit}%. Fortalezas verificadas en Ómicron, sin necesidad de pruebas adicionales."
                    </div>
                  )}
                  {i === 2 && (active || doneS) && (
                    <div style={{ marginTop: 8 }}>
                      {IQ.map((it, k) => (
                        <div key={k} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 7 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#eaf4ff' }}>{k + 1}. {it.q}</div>
                          <div style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
                            <button onClick={() => say(it.q)} style={miniBtn(C.cyan)}><Volume2 size={12} /> Escuchar</button>
                            <button onClick={() => practice(k)} style={miniBtn(C.gold)}><Mic size={12} /> Practicar</button>
                          </div>
                          <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.gold, marginTop: 7, lineHeight: 1.4 }}>💡 {it.tip}</div>
                          {fb[k] && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.green, marginTop: 6, lineHeight: 1.4 }}>{fb[k]}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {step >= 3 && (
          <button onClick={onClose} style={{ width: '100%', marginTop: 16, padding: 13, borderRadius: RADIUS.lg, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, #7df9ff, ${C.cyan})`, color: '#04121f', fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
            ✓ Listo · Ómicron gestiona el proceso
          </button>
        )}
      </div>
    </div>
  );
}

function miniBtn(color: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.mono, fontSize: 9, letterSpacing: .5, textTransform: 'uppercase', padding: '6px 10px', borderRadius: 10, cursor: 'pointer', background: `${color}14`, border: `1px solid ${color}55`, color };
}

// Tipos mínimos para SpeechRecognition (evita depender de libs de tipos del navegador)
interface SpeechResultLike { results: { 0: { transcript: string } }[]; }
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean;
  onresult: (e: SpeechResultLike) => void; onerror: () => void; start: () => void;
}
