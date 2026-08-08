// src/components/omicron/OrbOnboarding.tsx
// ONBOARDING CONVERSACIONAL — R1-R5 completas.
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../store/AppContext';
import { speak } from '../../lib/voiceEngine';
import { C, FONT, RADIUS } from '../../theme';

const ONBOARDING_KEY = 'omicron_onboarding_done';

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar') => void;
  onProfileGenerated?: (profile: GeneratedProfile) => void;
  onSkillsPreview?: (skills: string[]) => void;
}

export interface GeneratedProfile {
  profession: string;
  years: number;
  skills: string[];
  axes: { exec: number; qual: number; trans: number; fund: number };
  seniorLabel: string;
  summary: string;
}

const PROFILE_PROMPT = 'Eres Ómicron. El usuario te dice a qué se dedica en 1 frase. Extrae un perfil profesional ESTIMADO. Responde SOLO JSON válido: {"profession":"título corto","years":0,"skills":["skill1","skill2","skill3","skill4","skill5"],"axes":{"exec":0,"qual":0,"trans":0,"fund":0},"seniorLabel":"Profesional X","summary":"2 frases de quién es"} Reglas: skills 4-6, axes 0-100 (mínimo 20), seniorLabel real, conservador si no es claro.';

function classifyIntent(text: string): 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar' {
  const t = text.toLowerCase();
  if (/trabajo|empleo|busco|oportunidad|vacante|postular/.test(t)) return 'empleo';
  if (/aprender|curso|estudiar|mejorar|crecer|capacitar|react|python|node/.test(t)) return 'aprender';
  if (/validar|demostrar|certificar|skill|competencia|examen/.test(t)) return 'validar';
  if (/vender|servicio|freelance|ofrecer|monetizar|cobrar/.test(t)) return 'vender';
  return 'explorar';
}

function quickSkillsFromText(text: string): string[] {
  const t = text.toLowerCase();
  const matches: string[] = [];
  const map: [RegExp, string][] = [
    [/react|frontend|front.?end/, 'React'], [/node|backend|express/, 'Node.js'],
    [/python|django|flask/, 'Python'], [/typescript/, 'TypeScript'],
    [/docker|kubernetes|devops/, 'DevOps'], [/aws|cloud|azure/, 'Cloud'],
    [/figma|ux|ui|diseñ/, 'Diseño UX'], [/data|analyt|machine.?learn/, 'Data/IA'],
    [/ingenier|industrial|lean|procesos/, 'Ing. Industrial'],
    [/gesti[oó]n|liderazgo|scrum|agile/, 'Gestión'], [/market|ventas|growth/, 'Marketing'],
  ];
  for (const [regex, skill] of map) {
    if (regex.test(t) && matches.length < 6) matches.push(skill);
  }
  return matches;
}

const hasMicSupport = () => typeof window !== 'undefined' && !!(
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
);

export function OrbOnboarding({ onComplete, onProfileGenerated, onSkillsPreview }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [phase, setPhase] = useState<'ask' | 'processing' | 'result' | 'done'>('ask');
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const hasSpoken = useRef(false);
  const inputRef = useRef('');
  inputRef.current = input; // Always fresh for mic callback

  // Check if should hide (BEFORE hooks — but hooks still declared below)
  const shouldHide = (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY))
    || (profile?.skills && profile.skills.length > 0);

  // Mark done if already has skills
  useEffect(() => {
    if (profile?.skills && profile.skills.length > 0) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, [profile?.skills]);

  const userName = profile?.display_name || profile?.full_name || profile?.username || '';

  // Speak greeting once
  useEffect(() => {
    if (shouldHide || hasSpoken.current) return;
    hasSpoken.current = true;
    const t = setTimeout(() => {
      speak(userName ? `Hey ${userName}, soy Ómicron. Cuéntame, ¿a qué te dedicas?` : 'Hey, soy Ómicron. Cuéntame, ¿a qué te dedicas?');
    }, 1500);
    return () => clearTimeout(t);
  }, [shouldHide, userName]);

  // R5: Preview skills while typing
  useEffect(() => {
    if (shouldHide || phase !== 'ask' || input.length < 3) return;
    const preview = quickSkillsFromText(input);
    if (preview.length > 0) onSkillsPreview?.(preview);
  }, [input, phase, onSkillsPreview, shouldHide]);

  // Submit handler
  const handleSubmit = useCallback(async (overrideText?: string) => {
    const text = overrideText || inputRef.current;
    if (!text.trim() || generating) return;
    setGenerating(true);
    setPhase('processing');
    const quickSkills = quickSkillsFromText(text);
    if (quickSkills.length > 0) onSkillsPreview?.(quickSkills);
    speak('Déjame conocerte…');

    try {
      const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
      if (!OR_KEY) throw new Error('Sin key');
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OR_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://sistema-omicrom.vercel.app', 'X-Title': 'Sistema Omicron' },
        body: JSON.stringify({ model: 'google/gemma-4-31b-it:free', messages: [{ role: 'system', content: PROFILE_PROMPT }, { role: 'user', content: text.trim() }], max_tokens: 512, temperature: 0.5, response_format: { type: 'json_object' } }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const raw = data?.choices?.[0]?.message?.content ?? '';
      let parsed: GeneratedProfile | null = null;
      try { parsed = JSON.parse(raw); } catch { const a = raw.indexOf('{'); const b = raw.lastIndexOf('}'); if (a >= 0 && b > a) parsed = JSON.parse(raw.slice(a, b + 1)); }

      if (parsed && parsed.skills) {
        const intent = classifyIntent(text);
        onProfileGenerated?.(parsed);
        onSkillsPreview?.(parsed.skills);
        const msg = `Listo. Veo que dominas ${parsed.skills.slice(0, 3).join(', ')}. Tu perfil ya tiene forma.`;
        setResultMsg(msg); setPhase('result'); speak(msg);
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setTimeout(() => { setPhase('done'); onComplete(intent); }, 3500);
      } else { throw new Error('parse failed'); }
    } catch {
      const fallback: GeneratedProfile = { profession: text.trim().slice(0, 50), years: 3, skills: quickSkills.length > 0 ? quickSkills : ['Profesional', 'Adaptabilidad', 'Trabajo en equipo'], axes: { exec: 40, qual: 35, trans: 25, fund: 30 }, seniorLabel: 'Profesional', summary: `Profesional en ${text.trim().slice(0, 30)}.` };
      onProfileGenerated?.(fallback); onSkillsPreview?.(fallback.skills);
      setResultMsg('Ya tienes tu perfil base. Después lo afinamos.'); setPhase('result'); speak('Ya tienes tu perfil base.');
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setTimeout(() => { setPhase('done'); onComplete('cv'); }, 3000);
    } finally { setGenerating(false); }
  }, [generating, onComplete, onProfileGenerated, onSkillsPreview]);

  // Mic handler — passes transcript directly to handleSubmit (no stale closure)
  const handleMic = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = ((window as unknown as { SpeechRecognition?: any }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition);
    if (!SR) return;
    const recog = new SR();
    recog.lang = 'es-CL'; recog.interimResults = true; recog.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (e: any) => {
      const r = e.results[e.results.length - 1];
      setInput(r[0].transcript);
      if (r.isFinal) handleSubmit(r[0].transcript); // Pass transcript directly
    };
    recog.start();
  }, [handleSubmit]);

  // === RENDER ===
  if (shouldHide || phase === 'done') return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}
        style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', background: 'rgba(0,2,6,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '24px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)' }}>
        <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div key={phase} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ padding: '14px 18px', borderRadius: RADIUS.lg, background: C.surface, border: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, display: 'block', marginBottom: 6 }}>ÓMICRON</span>
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.5 }}>
              {phase === 'processing' && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: C.cyan, animation: 'cp-pulse 1s ease-in-out infinite' }} />Analizando tu perfil…</span>}
              {phase === 'result' && resultMsg}
              {phase === 'ask' && (userName ? `Hey ${userName}, cuéntame ¿a qué te dedicas?` : '¿A qué te dedicas? Cuéntame en una frase.')}
            </p>
          </motion.div>
          {phase === 'ask' && (
            <motion.form initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hasMicSupport() && (
                <button type="button" onClick={handleMic} aria-label="Hablar" style={{ width: 44, height: 44, borderRadius: '50%', border: `1px solid ${C.cyanDim}`, background: C.glass2, color: C.cyan, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>🎤</button>
              )}
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ej: Ingeniero industrial con 8 años" autoFocus
                style={{ flex: 1, padding: '14px 16px', borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.cyanDim}`, fontFamily: FONT.body, fontSize: 15, color: C.ink, outline: 'none' }} />
              <button type="submit" disabled={!input.trim() || generating}
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: input.trim() ? `linear-gradient(135deg, ${C.cyan}, ${C.purple})` : C.glass2, color: input.trim() ? '#000' : C.mut, cursor: input.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0, boxShadow: input.trim() ? '0 4px 16px rgba(92,200,255,0.3)' : 'none' }}>➤</button>
            </motion.form>
          )}
          {phase === 'ask' && !input && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['Desarrollador web', 'Diseñadora UX', 'Ingeniero industrial', 'Estudiante', 'Freelancer'].map(s => (
                <button key={s} onClick={() => setInput(s)} style={{ padding: '7px 14px', borderRadius: RADIUS.pill, background: C.glass, border: `1px solid ${C.line}`, color: C.ink, fontFamily: FONT.body, fontSize: 12, cursor: 'pointer' }}>{s}</button>
              ))}
            </motion.div>
          )}
          {phase === 'result' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: C.mut, margin: 0, letterSpacing: 1 }}>
              Preparando tu orbe…
            </motion.p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
