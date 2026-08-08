// src/components/omicron/OrbOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING CONVERSACIONAL — Ómicron pregunta, el usuario responde.
// El orbe ES el onboarding. No hay overlay estático ni botones genéricos.
// Flujo: pregunta → respuesta → perfil generado en <30 segundos.
//
// Implementa las 5 R's:
// R1: El orbe es el onboarding (conversational-first)
// R2: Progressive profiling (enriquecimiento gradual)
// R3: Intent-first routing (la respuesta define la ruta)
// R4: Zero-state productivo (perfil NUNCA vacío)
// R5: El orbe como espejo (feedback visual — delegado a OrbShell)
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import { speak } from '../../lib/voiceEngine';
import { C, FONT, RADIUS } from '../../theme';

const ONBOARDING_KEY = 'omicron_onboarding_done';

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos') => void;
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

// ── Prompt para generar perfil desde 1 frase ──────────────────────────
const PROFILE_PROMPT = `Eres Ómicron. El usuario te dice a qué se dedica en 1 frase.
Extrae un perfil profesional ESTIMADO (no inventar de más, solo inferir razonablemente).
Responde SOLO JSON válido:
{"profession":"título corto","years":0,"skills":["skill1","skill2","skill3","skill4","skill5"],"axes":{"exec":0,"qual":0,"trans":0,"fund":0},"seniorLabel":"Profesional X","summary":"2 frases de quién es"}
Reglas:
- skills: 4-6 habilidades inferidas de la profesión
- axes: estimado 0-100 basado en años y profesión (no poner 0 en nada — mínimo 20)
- seniorLabel: posicionamiento real (ej: "Ingeniero Industrial Mid-Senior")
- Si no puedes inferir algo, pon valores conservadores (40-50)`;

// ── Intent classifier para routing ───────────────────────────────────
function classifyIntent(text: string): 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar' {
  const t = text.toLowerCase();
  if (/trabajo|empleo|busco|oportunidad|vacante|postular/.test(t)) return 'empleo';
  if (/aprender|curso|estudiar|mejorar|crecer|capacitar/.test(t)) return 'aprender';
  if (/validar|demostrar|certificar|skill|competencia|examen/.test(t)) return 'validar';
  if (/vender|servicio|freelance|ofrecer|monetizar|cobrar/.test(t)) return 'vender';
  return 'explorar';
}

export function OrbOnboarding({ onComplete, onProfileGenerated }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [phase, setPhase] = useState<'ask' | 'processing' | 'done'>('ask');
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const hasSpoken = useRef(false);

  // Check if onboarding already done
  if (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY)) {
    return null;
  }

  // Si ya tiene skills, no necesita onboarding
  if (profile?.skills && profile.skills.length > 0) {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    return null;
  }

  const userName = profile?.display_name || profile?.full_name || profile?.username || '';

  // R1: Ómicron habla al usuario (solo una vez)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (hasSpoken.current) return;
    hasSpoken.current = true;
    const timer = setTimeout(() => {
      const greeting = userName
        ? `Hey ${userName}, soy Ómicron. Cuéntame, ¿a qué te dedicas?`
        : 'Hey, soy Ómicron, tu mentor digital. Cuéntame, ¿a qué te dedicas?';
      speak(greeting);
    }, 1500);
    return () => clearTimeout(timer);
  }, [userName]);

  // R1 + R4: Procesar respuesta → generar perfil con IA
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || generating) return;
    setGenerating(true);
    setPhase('processing');
    speak('Déjame conocerte. Un momento…');

    try {
      const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
      if (!OR_KEY) throw new Error('Sin key');

      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OR_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
          'X-Title': 'Sistema Omicron',
        },
        body: JSON.stringify({
          model: 'google/gemma-4-31b-it:free',
          messages: [
            { role: 'system', content: PROFILE_PROMPT },
            { role: 'user', content: input.trim() },
          ],
          max_tokens: 512,
          temperature: 0.5,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      let parsed: GeneratedProfile | null = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        const a = text.indexOf('{'); const b = text.lastIndexOf('}');
        if (a >= 0 && b > a) parsed = JSON.parse(text.slice(a, b + 1));
      }

      if (parsed && parsed.skills) {
        // R3: Determinar ruta según intent
        const intent = classifyIntent(input);

        // R4: Notificar perfil generado al padre (OrbShell lo guarda)
        onProfileGenerated?.(parsed);

        // Feedback amigable
        const skillList = parsed.skills.slice(0, 3).join(', ');
        speak(`Listo. Veo que dominas ${skillList}. Tu perfil ya tiene forma. ${
          intent === 'empleo' ? 'Te llevo a las oportunidades.' :
          intent === 'aprender' ? 'Vamos a la academia.' :
          intent === 'validar' ? 'Validemos tus skills.' :
          intent === 'vender' ? 'Armemos tu servicio.' :
          'Explora tu orbe — cada nodo es una posibilidad de crecimiento.'
        }`);

        setPhase('done');
        localStorage.setItem(ONBOARDING_KEY, 'true');

        // R3: Routing basado en intent
        setTimeout(() => {
          if (intent === 'empleo') onComplete('cv');
          else if (intent === 'validar') onComplete('examen');
          else onComplete('ambos');
        }, 2500);
      } else {
        throw new Error('No se pudo parsear');
      }
    } catch {
      // Fallback: si la IA falla, generar perfil genérico
      const fallback: GeneratedProfile = {
        profession: input.trim().slice(0, 50),
        years: 3,
        skills: ['Profesional', 'Adaptabilidad', 'Trabajo en equipo'],
        axes: { exec: 40, qual: 35, trans: 25, fund: 30 },
        seniorLabel: 'Profesional',
        summary: `Profesional con experiencia en ${input.trim().slice(0, 30)}.`,
      };
      onProfileGenerated?.(fallback);
      speak('Perfecto. Ya tienes tu perfil base. Después lo afinamos con tu CV.');
      setPhase('done');
      localStorage.setItem(ONBOARDING_KEY, 'true');
      setTimeout(() => onComplete('cv'), 2000);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, onComplete, onProfileGenerated]);

  // Phase: done → desaparece
  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      background: 'rgba(0,2,6,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      padding: '24px 20px',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 100px)',
    }}>
      {/* Conversación — minimalista, el orbe se ve detrás */}
      <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mensaje de Ómicron */}
        <div style={{
          padding: '14px 18px', borderRadius: RADIUS.lg,
          background: C.surface, border: `1px solid ${C.line}`,
          backdropFilter: 'blur(10px)',
        }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, display: 'block', marginBottom: 6 }}>
            ÓMICRON
          </span>
          <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.5 }}>
            {phase === 'processing'
              ? 'Analizando tu perfil… 🧬'
              : userName
                ? `Hey ${userName}, cuéntame ¿a qué te dedicas?`
                : '¿A qué te dedicas? Cuéntame en una frase.'}
          </p>
        </div>

        {/* Input del usuario (R1: conversacional) */}
        {phase === 'ask' && (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: Ingeniero industrial con 8 años"
              autoFocus
              style={{
                flex: 1, padding: '14px 16px', borderRadius: RADIUS.pill,
                background: C.surface, border: `1px solid ${C.cyanDim}`,
                fontFamily: FONT.body, fontSize: 15, color: C.ink,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || generating}
              style={{
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: input.trim() ? `linear-gradient(135deg, ${C.cyan}, ${C.purple})` : C.glass2,
                color: input.trim() ? '#000' : C.mut,
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'grid', placeItems: 'center', fontSize: 16,
                boxShadow: input.trim() ? `0 4px 16px rgba(92,200,255,0.3)` : 'none',
              }}
            >
              ➤
            </button>
          </form>
        )}

        {/* Chips de sugerencia (R3: intent-first) */}
        {phase === 'ask' && !input && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {[
              'Desarrollador web',
              'Diseñadora UX',
              'Ingeniero industrial',
              'Estudiante de ingeniería',
              'Freelancer creativo',
            ].map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                style={{
                  padding: '6px 12px', borderRadius: RADIUS.pill,
                  background: C.glass, border: `1px solid ${C.line}`,
                  color: C.ink, fontFamily: FONT.body, fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
