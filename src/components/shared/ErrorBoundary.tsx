// components/shared/ErrorBoundary.tsx
// Captura errores de render de cualquier pestaña/módulo y muestra un panel
// holográfico en vez de dejar la app en pantalla blanca.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError } from '../../lib/observability';

interface Props {
  children: ReactNode;
  /** Etiqueta opcional para identificar qué sección falló (ej. "Bóveda"). */
  section?: string;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Error desconocido' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log para diagnóstico (visible en consola del navegador).
    console.error('[Ómicron · ErrorBoundary]', this.props.section ?? '', error, info);
    // Reporta a Sentry si está activo (no hace nada si no hay DSN).
    captureError(error, {
      section: this.props.section ?? 'desconocida',
      componentStack: info.componentStack ?? '',
    });
  }

  private handleReset = () => this.setState({ hasError: false, message: '' });
  private handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.iconRing}>
            <span style={styles.icon}>⚠</span>
          </div>
          <div style={styles.title}>FALLO EN EL MÓDULO</div>
          {this.props.section && <div style={styles.section}>{this.props.section}</div>}
          <p style={styles.msg}>{this.state.message}</p>
          <div style={styles.btnRow}>
            <button style={styles.btnGhost} onClick={this.handleReset}>Reintentar</button>
            <button style={styles.btnPrimary} onClick={this.handleReload}>Recargar sistema</button>
          </div>
          <div style={styles.hint}>Si el problema persiste, cierra sesión y vuelve a entrar.</div>
        </div>
      </div>
    );
  }
}

const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
const RAJ = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', width: '100%', padding: 24, background: '#000206',
  },
  card: {
    width: '100%', maxWidth: 340, textAlign: 'center', padding: '28px 22px',
    borderRadius: 16, border: '1px solid rgba(255, 176, 46,0.35)',
    background: 'linear-gradient(145deg, rgba(8,16,38,0.6), rgba(2,6,19,0.85))',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 0 30px rgba(255, 176, 46,0.18), inset 0 1px 1px rgba(255,255,255,0.05)',
  },
  iconRing: {
    width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255, 176, 46,0.5)', background: 'rgba(255, 176, 46,0.08)',
    boxShadow: '0 0 18px rgba(255, 176, 46,0.35)',
    animation: 'amberBreathe 2.8s ease-in-out infinite',
  },
  icon: { fontSize: 26, color: '#ffb02e' },
  title: { fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: '#ffb02e', fontWeight: 700 },
  section: { fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: 'rgba(255, 176, 46,0.6)', marginTop: 4, textTransform: 'uppercase' },
  msg: {
    fontFamily: MONO, fontSize: 11, color: '#9fb3cc', margin: '14px 0 20px',
    lineHeight: 1.5, wordBreak: 'break-word',
  },
  btnRow: { display: 'flex', gap: 10 },
  btnGhost: {
    flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: 'rgba(92, 200, 255,0.08)', border: '1px solid rgba(92, 200, 255,0.35)',
    color: '#5cc8ff', fontFamily: RAJ, fontWeight: 700, fontSize: 13,
  },
  btnPrimary: {
    flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
    background: 'linear-gradient(90deg, #5cc8ff, #008b9e)', border: 'none',
    color: '#000206', fontFamily: RAJ, fontWeight: 700, fontSize: 13,
    boxShadow: '0 0 15px rgba(92, 200, 255,0.35)',
  },
  hint: { fontFamily: MONO, fontSize: 9, color: 'rgba(159,179,204,0.5)', marginTop: 16, letterSpacing: 0.5 },
};
