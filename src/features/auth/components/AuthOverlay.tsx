import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/infrastructure/supabase/client';
import { Eye, EyeOff, Shield, ArrowLeft, Mail } from 'lucide-react';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { getGuestProfile, clearGuestProfile } from '@/shared/utils/guestMode';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { C, FONT, SIZE, RADIUS } from '@/theme';

type AuthMode = 'login' | 'register' | 'forgot';

// Límites y reglas alineados a estándares de la industria:
// - Email: 254 caracteres máx. (RFC 5321/5322)
// - Contraseña: mínimo 8 (NIST SP 800-63B), máximo 72 (límite efectivo de
//   bcrypt, usado internamente por Supabase Auth/GoTrue)
// - Usuario: 3-24 caracteres, solo letras, números y guion bajo (sin
//   espacios ni símbolos)
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ═══════════════════════════════════════════════════════════════════════
// CSS inyectado una sola vez: cubre los estados interactivos (:focus,
// :hover, ::placeholder) que no se pueden expresar con estilos inline.
// El color de acento llega por variable CSS (--omi-accent), que el root
// define a partir del color que el usuario eligió en el onboarding.
// ═══════════════════════════════════════════════════════════════════════
function injectAuthStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('omicron-auth-css')) return;
  const s = document.createElement('style');
  s.id = 'omicron-auth-css';
  s.textContent = `
    .auth-input {
      transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .auth-input::placeholder { color: rgba(107,117,144,0.85); }
    /* !important es necesario porque el estilo base va inline (los estilos
       inline ganan a las hojas de estilo salvo con !important). */
    .auth-input:focus {
      outline: none;
      border-color: var(--omi-accent) !important;
      background: rgba(255,255,255,0.07) !important;
      box-shadow: 0 0 0 3px var(--omi-accent-soft);
    }
    .auth-submit { transition: filter .18s ease, transform .12s ease, box-shadow .18s ease; }
    .auth-submit:hover:not(:disabled) { filter: brightness(1.08); }
    .auth-submit:active:not(:disabled) { transform: scale(0.985); }
    .auth-tab { transition: color .18s ease, background .22s ease; }
    .auth-link { transition: color .18s ease; }
    .auth-link:hover { color: var(--omi-accent) !important; }
    .auth-eye { transition: background .18s ease, color .18s ease; }
    .auth-eye:hover { background: var(--omi-accent-faint) !important; color: ${C.ink} !important; }
    .auth-ghost { transition: border-color .18s ease, color .18s ease, background .18s ease; }
    .auth-ghost:hover {
      border-color: var(--omi-accent) !important;
      color: ${C.ink} !important;
      background: var(--omi-accent-faint) !important;
    }
  `;
  document.head.appendChild(s);
}
injectAuthStyles();

/**
 * Traduce al español los mensajes de error que llegan desde Supabase Auth
 * (el servidor responde en inglés). Nunca debe mostrarse un mensaje en
 * inglés al usuario final.
 */
function translateAuthError(message?: string): string {
  if (!message) return 'Ocurrió un error inesperado. Intenta nuevamente.';
  const normalized = message.toLowerCase();

  const knownErrors: Array<[RegExp, string]> = [
    [/invalid login credentials/, 'Usuario o contraseña incorrectos.'],
    [/email not confirmed/, 'Debes confirmar tu correo antes de iniciar sesión.'],
    [/user already registered/, 'Ya existe una cuenta registrada con este correo.'],
    [/password should be at least/, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`],
    [/unable to validate email address|invalid email/, 'El formato del correo no es válido.'],
    [/rate limit/, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
    [/network/, 'Error de conexión. Revisa tu internet e inténtalo de nuevo.'],
    [/user not found/, 'Usuario o contraseña incorrectos.'],
    [/signup requires a valid password/, 'Debes ingresar una contraseña válida.'],
    [/token has expired|invalid token/, 'El enlace expiró o no es válido. Solicita uno nuevo.'],
  ];

  for (const [pattern, translated] of knownErrors) {
    if (pattern.test(normalized)) return translated;
  }
  return 'Ocurrió un error. Intenta nuevamente.';
}

/** Migra el perfil generado como guest a Supabase al autenticarse */
async function migrateGuestProfile() {
  try {
    const guest = getGuestProfile();
    if (!guest) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      skills: guest.skills,
      skills_detail: guest.skills.map((s, i) => ({ name: s, pct: Math.max(40, 80 - i * 10) })),
      cv_summary: guest.summary,
      cv_years_experience: guest.years,
      execution_score: guest.axes.exec,
      quality_score: guest.axes.qual,
      transcendence_score: guest.axes.trans,
      foundation_score: guest.axes.fund,
    }).eq('id', user.id);
    clearGuestProfile();
  } catch { /* silencioso */ }
}

export function AuthOverlay({ onClose }: { onClose?: () => void } = {}) {
  // Color elegido por el usuario en el onboarding (ColorPicker). Es la
  // misma fuente que usan el orbe, el Reveal y todas las pestañas, así que
  // el login deja de ser la única pantalla con un acento distinto.
  const uc = useUserColor();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Limpia todos los campos y mensajes al alternar entre vistas
  // (login / registro / recuperar contraseña), evitando que los datos de
  // un formulario "sobrevivan" al cambiar de vista.
  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setUsername('');
    setShowPass(false);
    setError(null);
    setSuccess(null);
  }

  // Bloquea en tiempo real cualquier carácter que no sea letra, número o
  // guion bajo (sin espacios ni símbolos) y limita la longitud máxima
  // mientras se escribe.
  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const sanitized = e.target.value
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, USERNAME_MAX_LENGTH);
    setUsername(sanitized);
  }

  // Validación propia en español (independiente del navegador) para no
  // depender de los mensajes nativos, que llegan en inglés.
  function validate(): string | null {
    if (mode === 'register') {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) return 'El nombre de usuario es obligatorio.';
      if (trimmedUsername.length < USERNAME_MIN_LENGTH) {
        return `El nombre de usuario debe tener al menos ${USERNAME_MIN_LENGTH} caracteres.`;
      }
      if (!USERNAME_PATTERN.test(trimmedUsername)) {
        return 'El nombre de usuario solo puede contener letras, números y guion bajo.';
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return mode === 'login' ? 'El usuario es obligatorio.' : 'El correo es obligatorio.';
    }
    if (mode !== 'login' && !EMAIL_PATTERN.test(trimmedEmail)) {
      return 'El formato del correo no es válido.';
    }

    if (mode !== 'forgot') {
      if (!password) return 'La contraseña es obligatoria.';
      if (password.length < PASSWORD_MIN_LENGTH) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
      }
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim();

      if (mode === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}`,
        });
        if (err) throw err;
        setSuccess('Revisa tu correo para restablecer la contraseña.');
      } else if (mode === 'login') {
        // El campo de login acepta "usuario" o "email" indistintamente.
        // Supabase Auth solo autentica con email, así que si lo ingresado
        // no tiene forma de email, se resuelve el username -> email real
        // vía RPC (profiles no almacena email; solo vive en auth.users).
        let loginEmail = trimmedEmail;
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
          const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('get_email_for_login', {
            p_identifier: trimmedEmail,
          });
          if (rpcErr || !resolvedEmail) {
            throw new Error('Invalid login credentials');
          }
          loginEmail = resolvedEmail as string;
        }
        const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (err) throw err;
        // Migrar perfil guest al autenticarse
        migrateGuestProfile();
        // El cambio de estado de autenticación redirige automáticamente
      } else {
        const trimmedUsername = username.trim();
        const { data, error: err } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { username: trimmedUsername, full_name: trimmedUsername } },
        });
        if (err) throw err;
        // Analytics + migrar guest
        import('@/shared/utils/analytics').then(({ track }) => { track('signup_completed'); }).catch(() => {});
        migrateGuestProfile();
        if (data.user && !data.session) {
          setSuccess('Cuenta creada. Revisa tu correo para confirmar.');
        }
        // Si ya existe sesión, el usuario quedó auto-confirmado y será redirigido
      }
    } catch (err) {
      setError(translateAuthError(err instanceof Error ? err.message : undefined));
    } finally {
      setLoading(false);
    }
  }

  // En login se etiqueta genéricamente "Usuario" (no "Email") para no
  // confirmarle a un atacante que el campo espera específicamente un
  // correo, mitigando ataques de enumeración de cuentas.
  const identifierLabel = mode === 'login' ? 'Usuario' : 'Correo electrónico';
  const identifierPlaceholder = mode === 'login' ? 'Tu usuario o correo' : 'nodo@omicron.io';

  const submitLabel = loading
    ? 'Procesando...'
    : mode === 'login' ? 'Acceder a la Red'
    : mode === 'register' ? 'Unirse a Ómicron'
    : 'Enviar enlace de recuperación';

  return (
    // Las variables CSS (--omi-accent*) alimentan los estados :focus/:hover
    // del CSS inyectado. Mismo patrón que shared/motion/GlowCard.tsx.
    <div
      style={{
        ...S.root,
        '--omi-accent': uc,
        '--omi-accent-soft': `${uc}33`,
        '--omi-accent-faint': `${uc}1a`,
      } as CSSProperties}
    >
      {/* Halo ambiental con el color del usuario — mismo lenguaje visual
          que el fondo del orbe en el resto de la app. */}
      <div style={{ ...S.halo, background: `radial-gradient(circle, ${uc}1f 0%, transparent 70%)` }} />

      <div style={S.stack}>
        {/* ── Logo: orbe con el color elegido ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={S.logoBlock}
        >
          <div style={{ ...S.orbRing, border: `1px solid ${uc}4d`, boxShadow: `0 0 30px ${uc}33, inset 0 0 20px ${uc}14` }}>
            <GeodesicOrb size={80} nodes={10} color={uc} spinning={20} intensity={0.6} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={S.brand}>Sistema Ómicron</h1>
            <p style={S.tagline}>Tu reputación, imposible de falsificar.</p>
          </div>
        </motion.div>

        {/* ── Tarjeta glass premium ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={S.card}
        >
          {/* Barra de acento superior con el color del usuario */}
          <div style={{ ...S.cardAccent, background: `linear-gradient(90deg, transparent, ${uc}, transparent)` }} />

          {/* Tabs (control segmentado) */}
          {mode !== 'forgot' && (
            <div style={S.tabs}>
              {(['login', 'register'] as const).map(m => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    className="auth-tab"
                    onClick={() => switchMode(m)}
                    style={{
                      ...S.tab,
                      color: active ? '#fff' : C.mut,
                      fontWeight: active ? 700 : 500,
                      background: active ? `linear-gradient(135deg, ${uc}, ${C.purple})` : 'transparent',
                      boxShadow: active ? `0 4px 16px ${uc}44` : 'none',
                    }}
                  >
                    {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'forgot' && (
            <button type="button" className="auth-link" onClick={() => switchMode('login')} style={S.backLink}>
              <ArrowLeft size={16} />
              Volver a inicio de sesión
            </button>
          )}

          <form onSubmit={handleSubmit} noValidate style={S.form}>
            {mode === 'register' && (
              <div>
                <label style={S.label}>
                  Nombre de usuario <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  className="auth-input"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="tu_nodo"
                  required
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  autoComplete="off"
                  style={S.input}
                />
              </div>
            )}

            <div>
              <label style={S.label}>
                {identifierLabel} <span style={{ color: C.red }}>*</span>
              </label>
              <input
                type={mode === 'login' ? 'text' : 'email'}
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setEmail(v => v.trim())}
                placeholder={identifierPlaceholder}
                required
                maxLength={EMAIL_MAX_LENGTH}
                autoComplete={mode === 'login' ? 'username' : 'email'}
                style={S.input}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label style={S.label}>
                  Contraseña <span style={{ color: C.red }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="auth-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="..."
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={PASSWORD_MAX_LENGTH}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    style={{ ...S.input, paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() => setShowPass(!showPass)}
                    style={S.eye}
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p style={S.hint}>Mínimo {PASSWORD_MIN_LENGTH} caracteres.</p>
              </div>
            )}

            {error && (
              <div role="alert" style={{ ...S.alert, background: C.redFaint, border: `1px solid ${C.red}4d`, color: C.red }}>
                {error}
              </div>
            )}
            {success && (
              <div role="status" style={{ ...S.alert, background: C.greenFaint, border: `1px solid ${C.green}4d`, color: C.green }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              style={{
                ...S.submit,
                background: `linear-gradient(135deg, ${uc}, ${C.purple})`,
                boxShadow: `0 8px 28px ${uc}4d`,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {submitLabel}
            </button>

            {mode === 'login' && (
              <button type="button" className="auth-link" onClick={() => switchMode('forgot')} style={S.forgot}>
                <Mail size={14} />
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </form>

          <div style={S.secure}>
            <Shield size={12} />
            <span>Cifrado E2E · Red segura Ómicron</span>
          </div>
        </motion.div>

        {/* ── Badge Pioneer (dorado: acento de marca, no del usuario) ── */}
        <div style={S.pioneer}>
          <span style={{ fontSize: SIZE.lg }}>🏆</span>
          <span style={{ fontWeight: 600 }}>Etapa Fundacional activa — beneficio Pioneer</span>
        </div>

        {/* ── Modo invitado ──────────────────────────────────────────── */}
        {onClose && (
          <button onClick={onClose} className="auth-ghost" style={{ ...S.ghost, border: `1px solid ${uc}33` }}>
            Explorar sin cuenta →
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ESTILOS — sistema de tokens (@/theme), igual que el resto de la app.
// El acento nunca se hardcodea: llega por `uc` (color del usuario).
// ═══════════════════════════════════════════════════════════════════════
const S: Record<string, CSSProperties> = {
  root: {
    position: 'fixed', inset: 0, zIndex: 95,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', overflow: 'auto',
    background: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)',
  },
  halo: {
    position: 'absolute', top: '4%', left: '50%',
    transform: 'translateX(-50%)',
    width: 420, height: 420, pointerEvents: 'none',
  },
  stack: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 384,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    margin: 'auto',
  },
  logoBlock: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 12, marginBottom: 28,
  },
  orbRing: {
    width: 80, height: 80, borderRadius: RADIUS.pill, overflow: 'hidden',
  },
  brand: {
    margin: 0,
    fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl,
    letterSpacing: -0.5, color: C.ink,
  },
  tagline: {
    margin: '6px 0 0',
    fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.4, color: C.mut,
  },
  card: {
    position: 'relative', width: '100%',
    borderRadius: RADIUS.xl, padding: 24, overflow: 'hidden',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    border: `1px solid ${C.line}`,
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
  },
  tabs: {
    display: 'flex', gap: 4, padding: 4, marginBottom: 22,
    borderRadius: RADIUS.md,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${C.line}`,
  },
  tab: {
    flex: 1, padding: '9px 0', borderRadius: RADIUS.sm, border: 'none',
    fontFamily: FONT.display, fontSize: SIZE.sm,
    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  },
  backLink: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
    background: 'none', border: 'none', padding: 0,
    fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: {
    display: 'block', marginBottom: 6,
    fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4,
    textTransform: 'uppercase', color: C.mut,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', borderRadius: RADIUS.md,
    background: 'rgba(255,255,255,0.045)',
    border: `1px solid ${C.line}`,
    fontFamily: FONT.body, fontSize: SIZE.md, color: C.ink,
  },
  eye: {
    position: 'absolute', right: 6,
    width: 36, height: 36, borderRadius: RADIUS.sm,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', color: C.mut, cursor: 'pointer',
  },
  hint: {
    margin: '6px 0 0',
    fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut,
  },
  alert: {
    padding: '12px 16px', borderRadius: RADIUS.md,
    fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.45,
  },
  submit: {
    width: '100%', padding: '15px 0', borderRadius: RADIUS.md, border: 'none',
    fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md,
    letterSpacing: 0.2, color: '#fff',
  },
  forgot: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: '0 auto', background: 'none', border: 'none', padding: 0,
    fontFamily: FONT.body, fontSize: SIZE.sm, color: C.mut, cursor: 'pointer',
  },
  secure: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 18,
    fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut,
  },
  pioneer: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 22,
    fontFamily: FONT.body, fontSize: SIZE.xs, color: C.gold,
  },
  ghost: {
    width: '100%', marginTop: 16, padding: '13px 0',
    borderRadius: RADIUS.md, background: 'transparent',
    fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 0.5,
    color: 'rgba(234,240,251,0.7)', cursor: 'pointer',
  },
};
