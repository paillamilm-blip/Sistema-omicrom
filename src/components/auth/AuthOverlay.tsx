import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Zap, Shield, ArrowLeft, Mail } from 'lucide-react';

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

export function AuthOverlay() {
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
        // El cambio de estado de autenticación redirige automáticamente
      } else {
        const trimmedUsername = username.trim();
        const { data, error: err } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { username: trimmedUsername, full_name: trimmedUsername } },
        });
        if (err) throw err;
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-omicron-bg">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
          <Zap className="w-8 h-8 text-omicron-accent" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-omicron-text tracking-tight">Sistema Ómicron</h1>
          <p className="text-omicron-subtle text-sm mt-1">Capital Intelectual Digital</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-omicron-card border border-omicron-border rounded-2xl p-6 shadow-2xl">
        {/* Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-omicron-surface mb-6 p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-omicron-accent text-omicron-bg shadow'
                    : 'text-omicron-subtle hover:text-omicron-text'
                }`}
              >
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="flex items-center gap-2 text-omicron-subtle text-sm mb-4 hover:text-omicron-text transition"
          >
            <ArrowLeft size={16} />
            Volver a inicio de sesión
          </button>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Nombre de usuario <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="tu_nodo"
                required
                minLength={USERNAME_MIN_LENGTH}
                maxLength={USERNAME_MAX_LENGTH}
                autoComplete="off"
                className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
              {identifierLabel} <span className="text-red-400">*</span>
            </label>
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setEmail(v => v.trim())}
              placeholder={identifierPlaceholder}
              required
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete={mode === 'login' ? 'username' : 'email'}
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="text-xs text-omicron-subtle uppercase tracking-wide mb-1 block">
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="..."
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 pr-12 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-omicron-surface/50 hover:bg-omicron-accent/10 text-omicron-subtle hover:text-omicron-text transition"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-omicron-subtle mt-1">
                Mínimo {PASSWORD_MIN_LENGTH} caracteres.
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="bg-omicron-green/10 border border-omicron-green/30 rounded-xl px-4 py-3 text-omicron-green text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-omicron-accent hover:bg-omicron-magenta disabled:opacity-60 text-omicron-bg font-semibold py-3 rounded-xl transition-all active:scale-95 text-sm"
          >
            {loading ? 'Procesando...' : mode === 'login' ? 'Acceder a la Red' : mode === 'register' ? 'Unirse a Ómicron' : 'Enviar enlace de recuperación'}
          </button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="flex items-center justify-center gap-2 text-omicron-subtle text-sm hover:text-omicron-accent transition mx-auto"
            >
              <Mail size={14} />
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 mt-4 justify-center text-omicron-subtle text-xs">
          <Shield size={12} />
          <span>Cifrado E2E · Red segura Ómicron</span>
        </div>
      </div>

      {/* Pioneer badge */}
      <div className="mt-6 flex items-center gap-2 text-omicron-gold text-xs">
        <span className="text-base">🏆</span>
        <span className="font-medium">Etapa Fundacional activa — beneficio Pioneer</span>
      </div>
    </div>
  );
}
