// src/components/omicron/OrbOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// Onboarding de primera vez — explica qué es Ómicron y da opciones claras.
// Solo aparece UNA VEZ (se guarda en localStorage).
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { speak } from '../../lib/voiceEngine';
import { C, FONT } from '../../theme';

const ONBOARDING_KEY = 'omicron_onboarding_done';

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos') => void;
}

export function OrbOnboarding({ onComplete }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [step, setStep] = useState<'welcome' | 'choose'>('welcome');

  // Check if onboarding already done
  if (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY)) {
    return null;
  }

  const userName = profile?.display_name || profile?.username || 'operador';

  const handleStart = () => {
    setStep('choose');
    speak('Perfecto. Elige cómo quieres empezar.');
  };

  const handleChoice = (choice: 'examen' | 'cv' | 'ambos') => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    if (choice === 'examen') {
      speak('Vamos con el examen. Te voy a evaluar para conocer tu nivel real.');
    } else if (choice === 'cv') {
      speak('Subí tu CV y en segundos conozco tu perfil completo.');
    } else {
      speak('Excelente. Primero tu CV, después validamos con un examen.');
    }
    onComplete(choice);
  };

  // Speak welcome on first render
  if (step === 'welcome') {
    setTimeout(() => {
      speak(`Hola ${userName}. Soy Ómicron, tu sistema de aprendizaje continuo en tiempo real. Cada nodo que ves es una posibilidad de crecimiento. Toca empezar cuando estés listo.`);
    }, 1000);
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,2,6,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '24px',
    }}>
      {step === 'welcome' && (
        <div style={{ maxWidth: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          {/* Title */}
          <h1 style={{
            fontFamily: FONT.display,
            fontSize: 22,
            fontWeight: 700,
            color: C.ink,
            margin: 0,
            lineHeight: 1.3,
          }}>
            Sistema de Aprendizaje<br />Continuo en Tiempo Real
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: FONT.body,
            fontSize: 14,
            color: C.mut,
            margin: 0,
            lineHeight: 1.6,
          }}>
            Ómicron mide tu conocimiento real, lo conecta con oportunidades del mercado al instante, y te empuja a mejorar cada día.
          </p>

          {/* What is the orb */}
          <p style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: C.cyanDim,
            margin: 0,
            lineHeight: 1.5,
          }}>
            Cada nodo del orbe es una competencia. Los brillantes son las que ya dominás. Los tenues te esperan.
          </p>

          {/* CTA */}
          <button
            onClick={handleStart}
            style={{
              marginTop: 8,
              padding: '14px 32px',
              borderRadius: 28,
              border: 'none',
              background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
              color: '#fff',
              fontFamily: FONT.display,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: `0 8px 24px rgba(92,200,255,0.3)`,
              transition: 'transform 0.15s ease',
            }}
          >
            Empezar
          </button>
        </div>
      )}

      {step === 'choose' && (
        <div style={{ maxWidth: 340, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <h2 style={{
            fontFamily: FONT.display,
            fontSize: 18,
            fontWeight: 700,
            color: C.ink,
            margin: 0,
          }}>
            ¿Cómo quieres empezar?
          </h2>

          <p style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: C.mut,
            margin: 0,
            lineHeight: 1.5,
          }}>
            Para conocer tu nivel real necesito al menos uno de estos:
          </p>

          {/* Option 1: Examen IA */}
          <button
            onClick={() => handleChoice('examen')}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: `1px solid ${C.cyanFaint}`,
              background: C.cyanGhost,
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.cyan }}>
              Tomar un Examen IA
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut }}>
              La IA te evalúa en tiempo real y descubre tu nivel en minutos
            </span>
          </button>

          {/* Option 2: Subir CV */}
          <button
            onClick={() => handleChoice('cv')}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: `1px solid ${C.purpleFaint}`,
              background: 'rgba(94,92,230,0.06)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.purple }}>
              Subir mi CV
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut }}>
              Analizo tu CV con IA y extraigo tu perfil completo en segundos
            </span>
          </button>

          {/* Option 3: Ambos */}
          <button
            onClick={() => handleChoice('ambos')}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: `1px solid ${C.goldFaint}`,
              background: 'rgba(255,176,46,0.06)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.gold }}>
              Ambos (recomendado)
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut }}>
              CV + examen = la validación más completa de tu conocimiento
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
