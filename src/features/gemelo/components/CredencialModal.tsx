// features/gemelo/components/CredencialModal.tsx
// ═══════════════════════════════════════════════════════════════════════
// CREDENCIAL ÓMICROM — Tu Gemelo Digital como credencial verificable.
//
// A diferencia de GemeloTab (el "taller" interno donde trabajás tu perfil),
// este modal presenta tu Gemelo Digital como una CREDENCIAL: el equivalente
// visual a una tarjeta de presentación / documento oficial, pensada para
// mostrar y compartir con otros profesionales.
//
// El orbe actúa como RETRATO (no como asistente vivo): contenido, quieto,
// enmarcado. Es el héroe visual pero no domina la tarjeta.
//
// CERO JERGA: cada número se muestra con su escala (NN/100) y con el
// significado claro (Reputación, Ejecución, etc.).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, Share2, Download, Zap, Shield, Globe, TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp, useGemeloDigital } from '@/store/AppContext';
import { C, FONT, SIZE, RADIUS } from '@/theme';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { ShareCredentialModal } from '@/features/gemelo/components/RedSocial';

// Fondo radial de la marca Ómicrom (mismo lenguaje que BASE.root del tema).
const OMICRON_BG = 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)';

// ── Stacks tipográficos para el canvas (los tokens FONT no son legibles
// desde el contexto 2D; replicamos las familias del tema como literales). ──
const CANVAS_SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";
const CANVAS_MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

// Datos mínimos para dibujar la credencial descargable. Los colores llegan
// como hex (el canvas no puede leer los tokens del tema) para respetar el
// color personal del usuario en los acentos.
type CredentialDrawData = {
  name: string;
  seniorLabel: string;
  years: number;
  reputation: number;
  accent: string; // color personal del usuario (uc)
  axes: { label: string; value: number; color: string }[];
};

// ═══════════════════════════════════════════════════════════════════════
// drawCredential — Renderiza la credencial como tarjeta PNG compartible.
//
// Técnica rescatada de PasaporteGemelo (canvas 2D 600x860 + toDataURL), pero
// adaptada a los datos propios de la Credencial y al color personal del
// usuario: la "Ω", el número de reputación y la línea de acento superior usan
// `accent` (uc), NO un cian hardcodeado. Cada número se muestra con /100.
// ═══════════════════════════════════════════════════════════════════════
function drawCredential(cv: HTMLCanvasElement, data: CredentialDrawData): void {
  const x = cv.getContext('2d');
  if (!x) return;
  const W = cv.width, H = cv.height;
  const accent = data.accent;

  // Fondo: gradiente navy Ómicrom.
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#04122a'); g.addColorStop(0.5, '#02081a'); g.addColorStop(1, '#06122e');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // Borde fino.
  x.strokeStyle = 'rgba(160,174,192,0.35)'; x.lineWidth = 2; x.strokeRect(16, 16, W - 32, H - 32);

  // Línea de acento superior (color del usuario).
  x.fillStyle = accent; x.fillRect(W / 2 - 60, 40, 120, 3);

  x.textAlign = 'center';

  // Glifo Ω (acento del usuario).
  x.fillStyle = accent; x.font = 'bold 92px Georgia, serif'; x.fillText('\u03A9', W / 2, 148);

  // Título + subtítulo.
  x.fillStyle = '#eaf4ff'; x.font = `bold 34px ${CANVAS_SANS}`; x.fillText('Sistema Ómicrom', W / 2, 196);
  x.fillStyle = 'rgba(160,174,192,0.75)'; x.font = `15px ${CANVAS_MONO}`;
  x.fillText('CREDENCIAL · GEMELO DIGITAL', W / 2, 224);

  // Nombre + seniority + años.
  const name = data.name.trim() || 'Tu Gemelo Digital';
  x.fillStyle = '#eaf4ff'; x.font = `bold 30px ${CANVAS_SANS}`; x.fillText(name, W / 2, 292);
  const sub = data.years > 0 ? `${data.seniorLabel} · ${data.years} años` : data.seniorLabel;
  x.fillStyle = 'rgba(234,244,255,0.6)'; x.font = `16px ${CANVAS_SANS}`; x.fillText(sub, W / 2, 322);

  // Reputación: número grande (acento) + /100.
  x.fillStyle = 'rgba(234,244,255,0.55)'; x.font = `14px ${CANVAS_MONO}`;
  x.fillText('REPUTACIÓN', W / 2, 372);
  const rep = Math.round(data.reputation);
  const repStr = String(rep);
  // Dibujamos el número (acento) y su "/100" centrados como conjunto.
  x.font = `bold 78px ${CANVAS_SANS}`;
  const repW = x.measureText(repStr).width;
  x.font = `20px ${CANVAS_MONO}`;
  const suffixW = x.measureText('/100').width;
  const totalW = repW + 8 + suffixW;
  const startX = W / 2 - totalW / 2;
  x.textAlign = 'left';
  x.fillStyle = accent; x.font = `bold 78px ${CANVAS_SANS}`;
  x.fillText(repStr, startX, 440);
  x.fillStyle = 'rgba(160,174,192,0.75)'; x.font = `20px ${CANVAS_MONO}`;
  x.fillText('/100', startX + repW + 8, 440);
  x.textAlign = 'center';

  // Modelo 20/80.
  x.fillStyle = 'rgba(160,174,192,0.7)'; x.font = `13px ${CANVAS_MONO}`;
  x.fillText('20% credenciales · 80% desempeño demostrado', W / 2, 470);

  // Los 4 ejes como barras etiquetadas con /100 (colores del modal).
  let yy = 522;
  x.textAlign = 'left';
  data.axes.forEach(({ label, value, color }) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    x.fillStyle = 'rgba(234,244,255,0.85)'; x.font = `15px ${CANVAS_MONO}`;
    x.fillText(label, 50, yy - 8);
    x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,0.5)'; x.font = `13px ${CANVAS_MONO}`;
    x.fillText(`${v}/100`, W - 50, yy - 8);
    x.textAlign = 'left';
    x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(50, yy, W - 100, 11);
    x.fillStyle = color; x.fillRect(50, yy, ((W - 100) * v) / 100, 11);
    yy += 56;
  });

  // Pie de página.
  x.textAlign = 'center'; x.fillStyle = 'rgba(160,174,192,0.6)'; x.font = `12px ${CANVAS_MONO}`;
  x.fillText('Verificable en Ómicrom · Conocimiento verificable, no declarado', W / 2, H - 40);
}

// Título de bloque reutilizable: punto de acento del color personal + label mono.
function BlockTitle({ uc, children }: { uc: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: uc, boxShadow: `0 0 6px ${uc}88`, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase' }}>
        {children}
      </span>
    </div>
  );
}

export function CredencialModal({ onClose }: { onClose: () => void }) {
  const { profile } = useApp();
  const gemelo = useGemeloDigital();
  const uc = useUserColor();
  const [showShare, setShowShare] = useState(false);

  // ── Datos derivados (mismo patrón exacto que GemeloTab) ────────────────
  const name = profile?.display_name || profile?.full_name || profile?.username || '';
  const username = profile?.username;
  const years = profile?.cv_years_experience ?? 0;
  const seniorLabel = years >= 10 ? 'Profesional Senior'
    : years >= 5 ? 'Profesional Mid-Senior'
    : years >= 2 ? 'Profesional Mid'
    : 'Profesional';

  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details;
    return (profile?.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
  }, [profile?.skills_detail, profile?.skills]);

  // Ejes del Gemelo. Ejecución adopta el color del usuario (convención GemeloTab).
  const axes: { key: string; label: string; value: number; color: string; Icon: LucideIcon }[] = [
    { key: 'exec', label: 'Ejecución', value: gemelo?.execution ?? profile?.execution_score ?? 0, color: uc, Icon: Zap },
    { key: 'qual', label: 'Calidad', value: gemelo?.quality ?? profile?.quality_score ?? 0, color: C.purple, Icon: Shield },
    { key: 'trans', label: 'Trascendencia', value: gemelo?.transcendence ?? profile?.transcendence_score ?? 0, color: C.gold, Icon: Globe },
    { key: 'fund', label: 'Fundamento', value: gemelo?.foundation ?? profile?.foundation_score ?? 0, color: C.green, Icon: TrendingUp },
  ];
  // Clamp 0-100: la reputación es server-side, pero acotamos por si llega
  // un valor fuera de rango (mantiene el "/100" honesto en pantalla y PNG).
  const reputation = Math.max(0, Math.min(100, Math.round(gemelo?.overallReputation ?? profile?.reputation_score ?? 0)));

  // Nodos del orbe: entre 6 y 42, proporcional a la cantidad de skills.
  const orbNodes = Math.min(42, Math.max(6, skillsDetail.length));

  // ── Bloque PERFIL PROFESIONAL: resumen del CV (truncado ~280 chars) ────
  const cvSummary = (profile?.cv_summary ?? '').trim();
  const cvSummaryText = cvSummary.length > 280 ? `${cvSummary.slice(0, 280).trimEnd()}…` : cvSummary;

  // ── Bloque COMPETENCIAS VERIFICADAS: top ~6 competencias ───────────────
  const topSkills = useMemo(() => skillsDetail.slice(0, 6), [skillsDetail]);

  // ── Bloque TRAYECTORIA VERIFICADA: evidencia de tono profesional ───────
  const contractsDone = profile?.total_contracts_completed ?? 0;
  const isVerifiedPro = profile?.is_verified_professional ?? false;
  const evidence: string[] = [];
  if (contractsDone > 0) evidence.push(`${contractsDone} proyectos completados`);
  if (isVerifiedPro) evidence.push('Profesional verificado');

  // ── Descargar credencial como PNG ──────────────────────────────────────
  // Genera una tarjeta compartible (WhatsApp/email) usando canvas 2D. Los
  // acentos usan el color personal del usuario (uc); cada número lleva /100.
  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 860;
    drawCredential(canvas, {
      name,
      seniorLabel,
      years,
      reputation,
      accent: uc,
      // Colores hex explícitos (el canvas no lee los tokens del tema):
      // Ejecución = color del usuario, Calidad = C.purple, Trascendencia =
      // C.gold, Fundamento = C.green. Mismos ejes/orden que el modal.
      axes: [
        { label: 'Ejecución', value: axes[0].value, color: uc },
        { label: 'Calidad', value: axes[1].value, color: '#5e5ce6' },
        { label: 'Trascendencia', value: axes[2].value, color: '#ffb02e' },
        { label: 'Fundamento', value: axes[3].value, color: '#3fd0c9' },
      ],
    });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'credencial-omicron.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: OMICRON_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto',
          borderRadius: RADIUS.xl,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: `1px solid ${C.line}`,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Barra de acento superior (color del usuario) ── */}
        <div style={{ height: 3, borderRadius: '3px 3px 0 0', background: `linear-gradient(90deg, transparent, ${uc}, transparent)` }} />

        {/* ── Botón cerrar ── */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.line}`, color: C.ink,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* ── Encabezado compacto: orbe pequeño (esquina superior) + identidad ── */}
          {/* El orbe se muestra achicado como "retrato" en la esquina superior
              izquierda (mismo tratamiento que la orbe de carga de OrbShell), de
              modo que no invade ni empuja el nombre. La X de cerrar queda a la
              derecha, así que el orbe va a la izquierda para evitar colisión. */}
          <div style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* ── Orbe como RETRATO contenido (pequeño, esquina) ── */}
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              <GeodesicOrb
                size={64}
                spinning={0}
                breathing
                intensity={0.6}
                color={uc}
                nodes={orbNodes}
              />
            </div>

            {/* ── Identidad: eyebrow + nombre + seniority ── */}
            {/* paddingRight deja espacio para la X (top:14 right:14) sin solapar. */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 36 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2.5, color: uc, textTransform: 'uppercase' }}>
                Credencial Ómicrom
              </div>
              <h2 style={{ margin: '4px 0 0', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.xl, color: C.ink, letterSpacing: -0.3 }}>
                {name || 'Tu Gemelo Digital'}
              </h2>
              <p style={{ margin: '3px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut }}>
                {seniorLabel}{years > 0 ? ` · ${years} años` : ''}
              </p>
            </div>
          </div>

          {/* ── Reputación ── */}
          <div style={{ width: '100%', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 6 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1, color: C.mut, textTransform: 'uppercase', marginRight: 4 }}>
                Reputación
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color: uc, letterSpacing: -0.5 }}>
                {reputation}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, color: C.mut }}>/100</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, marginTop: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${reputation}%` }}
                transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
                style={{ height: '100%', borderRadius: 3, background: uc, boxShadow: `0 0 6px ${uc}66` }}
              />
            </div>
            {/* Modelo 20/80: la reputación combina credenciales + desempeño demostrado. */}
            <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'left' }}>
              20% credenciales · 80% desempeño demostrado
            </p>
          </div>

          {/* ═══ CREDENCIAL ESPEJO: CV + verificación lado a lado ═══════════ */}

          {/* ── Bloque PERFIL PROFESIONAL (se oculta si no hay CV) ── */}
          {cvSummaryText && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
              style={{
                position: 'relative', width: '100%', marginTop: 20, padding: 16,
                borderRadius: RADIUS.lg, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.line}`, overflow: 'hidden',
              }}
            >
              {/* Barra de acento vertical con la gradiente de la marca personal. */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${uc}, ${C.purple}, ${C.gold})` }} />
              <BlockTitle uc={uc}>Perfil Profesional</BlockTitle>
              <p style={{ margin: '10px 0 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {cvSummaryText}
              </p>
            </motion.section>
          )}

          {/* ── Bloque COMPETENCIAS VERIFICADAS ── */}
          {topSkills.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
              style={{
                width: '100%', marginTop: 18, padding: 16,
                borderRadius: RADIUS.lg, background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${C.line}`,
              }}
            >
              <BlockTitle uc={uc}>Nivel de Competencias</BlockTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
                {topSkills.map((skill, i) => {
                  const pct = Math.round(skill.pct);
                  // Estado de DOMINIO (no verificación real): sin flag por-competencia
                  // en el tipo, usamos el pct. pct >= 70 → "Dominio alto". Cuando exista
                  // verificación real por competencia, cambiar a "Verificada" con su flag.
                  const highMastery = pct >= 70;
                  return (
                    <div key={`${skill.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>{skill.name}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: highMastery ? uc : C.mut }}>
                        {pct}<span style={{ fontSize: SIZE.xxs, color: C.mut }}>/100</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 96, justifyContent: 'flex-end' }}>
                        {highMastery
                          ? <CheckCircle2 size={13} color={uc} />
                          : <Circle size={13} color={C.mut} />}
                        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.4, color: highMastery ? C.ink : C.mut }}>
                          {highMastery ? 'Dominio alto' : 'En desarrollo'}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ── Bloque TRAYECTORIA VERIFICADA (siempre presente: contiene los ejes) ── */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
            style={{
              width: '100%', marginTop: 18, padding: 16,
              borderRadius: RADIUS.lg, background: 'rgba(255,255,255,0.045)',
              border: `1px solid ${C.line}`,
            }}
          >
            <BlockTitle uc={uc}>Trayectoria Verificada</BlockTitle>

            {/* Evidencia de tono profesional (solo filas con dato > 0). */}
            {evidence.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {evidence.map((text) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color={C.green} />
                    <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>{text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Los 4 ejes del Gemelo como pieza central de la evidencia medible. */}
            <p style={{ margin: '16px 0 10px', fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.5, color: C.mut, textTransform: 'uppercase' }}>
              Nivel de conocimiento medido
            </p>
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {axes.map(({ key, label, value, color, Icon }, i) => {
                const val = Math.round(value);
                return (
                  <div
                    key={key}
                    style={{
                      padding: '12px 12px', borderRadius: RADIUS.md,
                      background: `${color}0d`, border: `1px solid ${color}33`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <Icon size={13} color={color} />
                      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 0.5, color: C.mut, textTransform: 'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: `${color}22`, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 3, background: color, boxShadow: `0 0 5px ${color}66` }}
                        />
                      </div>
                      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.sm, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>
                        {val}<span style={{ fontSize: SIZE.xxs, fontWeight: 600, color: C.mut }}>/100</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ── Compartir credencial (primario) ── */}
          <button
            onClick={() => username && setShowShare(true)}
            disabled={!username}
            style={{
              width: '100%', marginTop: 22, padding: '13px', borderRadius: RADIUS.lg,
              cursor: username ? 'pointer' : 'not-allowed',
              background: username ? uc : 'rgba(255,255,255,0.05)',
              border: username ? 'none' : `1px solid ${C.line}`,
              color: username ? '#021018' : C.mut,
              fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: username ? 1 : 0.6,
            }}
          >
            <Share2 size={16} /> Compartir
          </button>

          {/* ── Descargar credencial como PNG (secundario) ── */}
          <button
            onClick={handleDownload}
            style={{
              width: '100%', marginTop: 10, padding: '13px', borderRadius: RADIUS.lg,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${C.line}`,
              color: C.ink,
              fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Download size={16} /> Descargar
          </button>

          {!username && (
            <p style={{ margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'center' }}>
              Crea tu usuario público para poder compartir tu credencial.
            </p>
          )}

          {/* ── Sello de verificación ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <CheckCircle2 size={13} color={C.green} />
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.5, color: C.mut }}>
              Conocimiento verificable, no declarado
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Modal de compartir (reutiliza QR/link existente) ── */}
      {showShare && username && (
        <ShareCredentialModal username={username} fullName={name} onClose={() => setShowShare(false)} />
      )}
    </motion.div>
  );
}
