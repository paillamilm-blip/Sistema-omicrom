// src/components/OraculoBar.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Oráculo (barra de voz flotante)
// Botón-micrófono flotante: hablas y el Oráculo navega tu app, responde
// datos simples o te da un consejo con IA real (Edge Function `coach`).
// Totalmente defensivo: detecta soporte de voz y no lanza excepciones.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from 'react';
import { Mic, Sparkles, X } from 'lucide-react';
import { useApp, useGemeloDigital } from '../store/AppContext';
import { interpret, askCoach } from '../lib/oraculo';
import { C, FONT } from '../theme';

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vs = window.speechSynthesis.getVoices();
    const v = vs.find((x) => /es(-|_)/i.test(x.lang)) || vs.find((x) => x.lang.startsWith('es'));
    if (v) u.voice = v;
    u.lang = v?.lang || 'es-ES';
    u.rate = 1.03;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
}

export function OraculoBar() {
  const { setActiveTab, profile } = useApp();
  const gemelo = useGemeloDigital();
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [msg, setMsg] = useState<{ who: 'tu' | 'oraculo'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const recogRef = useRef<ReturnType<SpeechRecognitionCtor> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  function flash(who: 'tu' | 'oraculo', text: string, ms = 6000) {
    setMsg({ who, text });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMsg(null), ms);
  }

  async function handle(text: string) {
    flash('tu', text);
    const intent = interpret(text);
    if (intent.kind === 'navigate') {
      setActiveTab(intent.tab);
      const t = `Abriendo ${intent.label}.`;
      flash('oraculo', t);
      speak(t);
      return;
    }
    if (intent.kind === 'fact') {
      let t = '';
      if (intent.topic === 'reputacion') t = `Tu reputación es ${(gemelo?.overallReputation ?? 0).toFixed(1)} sobre 100.`;
      else if (intent.topic === 'tokens') t = `Tienes ${(profile?.token_balance ?? 0).toLocaleString()} tokens.`;
      else if (intent.topic === 'pe') t = `Acumulas ${(profile?.pe_points ?? 0).toLocaleString()} puntos de experiencia.`;
      else t = 'Soy tu Oráculo. Dime: abre mi billetera, ve a la academia, cuánta reputación tengo, o pídeme un consejo.';
      flash('oraculo', t);
      speak(t);
      return;
    }
    if (intent.kind === 'coach') {
      setBusy(true);
      flash('oraculo', 'Consultando al Coach IA…', 20000);
      speak('Déjame analizar tu Gemelo Digital.');
      const r = await askCoach();
      setBusy(false);
      const t = r.advice || r.error || 'Sin respuesta.';
      flash('oraculo', t, 14000);
      speak(t.length > 320 ? t.slice(0, 320) : t);
      return;
    }
    const t = 'No te entendí. Puedes decir: abre mi billetera, ve a gobernanza, o pídeme un consejo.';
    flash('oraculo', t);
    speak(t);
  }

  function toggleListen() {
    if (!supported) {
      flash('oraculo', 'Tu navegador no soporta reconocimiento de voz. Prueba en Chrome.');
      return;
    }
    if (listening) {
      try { recogRef.current?.stop(); } catch { /* noop */ }
      return;
    }
    try {
      const SR = ((window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition) as SpeechRecognitionCtor;
      const recog = new SR();
      recogRef.current = recog;
      recog.lang = 'es-ES';
      recog.interimResults = true;
      recog.continuous = false;
      recog.onresult = (e) => {
        let txt = '';
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        flash('tu', txt, 12000);
        const last = e.results[e.results.length - 1] as unknown as { isFinal?: boolean };
        if (last && last.isFinal) setTimeout(() => handle(txt), 150);
      };
      recog.onerror = () => setListening(false);
      recog.onend = () => setListening(false);
      recog.start();
      setListening(true);
      flash('oraculo', 'Te escucho…', 8000);
    } catch {
      setListening(false);
    }
  }

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, []);

  const R = C.cyan;

  return (
    <div style={{ position: 'fixed', right: 14, bottom: 78, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
      {/* Burbuja de respuesta */}
      {open && msg && (
        <div style={{
          maxWidth: 300, padding: '10px 13px', borderRadius: 14,
          background: 'rgba(6,12,26,0.94)', border: `1px solid ${R}66`,
          boxShadow: '0 10px 34px rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
          fontFamily: FONT.body, fontSize: 13, color: '#eaf2ff', lineHeight: 1.5,
        }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: msg.who === 'tu' ? R : C.gold }}>
            {msg.who === 'tu' ? 'TÚ ▸ ' : 'ORÁCULO ▸ '}
          </span>
          {msg.text}
        </div>
      )}

      {open && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Cerrar */}
          <button
            onClick={() => { setOpen(false); setMsg(null); try { recogRef.current?.stop(); } catch { /* noop */ } }}
            aria-label="Cerrar Oráculo"
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#eaf2ff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
          >
            <X size={15} />
          </button>
          {/* Micrófono */}
          <button
            onClick={toggleListen}
            aria-label="Hablar al Oráculo"
            style={{
              width: 56, height: 56, borderRadius: '50%', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
              background: listening ? `${C.red}22` : `linear-gradient(135deg, #7df9ff, ${R})`,
              border: `1px solid ${listening ? C.red : R}`,
              color: listening ? C.red : '#020613',
              boxShadow: listening ? `0 0 22px ${C.red}88` : `0 0 22px ${R}66`,
              animation: (listening || busy) ? 'cp-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            <Mic size={22} />
          </button>
        </div>
      )}

      {/* FAB para abrir */}
      {!open && (
        <button
          onClick={() => { setOpen(true); flash('oraculo', 'Toca el micrófono y háblame: "abre mi billetera" o "dame un consejo".', 9000); }}
          aria-label="Abrir Oráculo"
          style={{
            width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            background: `linear-gradient(135deg, #7df9ff, ${R})`, border: `1px solid ${R}`,
            color: '#020613', boxShadow: `0 0 20px ${R}66`,
          }}
        >
          <Sparkles size={22} />
        </button>
      )}
    </div>
  );
}

export default OraculoBar;
