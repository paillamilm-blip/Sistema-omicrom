// components/perfil/RedSocial.tsx
// Red de contactos de Ómicrom: compartir credencial (QR + link),
// ver credencial pública de otra persona, conectar (con match mutuo),
// bandeja de solicitudes + mi red, y chat directo (DM) entre conexiones.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Share2, Copy, Check, QrCode, UserPlus, Users, Clock,
  BadgeCheck, MapPin, Shield, ShieldCheck, Loader2, MessageCircle, Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { ProgressRadar } from '../shared/ProgressRadar';
import { C, FONT, RADIUS } from '../../theme';
import type { GemeloDigital } from '../../types';

// ─── Helpers ────────────────────────────────────────────────────────────────
function rango(rep: number) {
  if (rep >= 80) return { label: 'SENIOR', emoji: '🏆', color: C.green };
  if (rep >= 70) return { label: 'AVANZADO', emoji: '⚡', color: C.cyan };
  if (rep >= 50) return { label: 'INTERMEDIO', emoji: '🔷', color: C.gold };
  return { label: 'EN FORMACIÓN', emoji: '🌱', color: C.purple };
}

function profileLink(username: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?perfil=${encodeURIComponent(username)}`;
}

function initialsOf(name?: string) {
  return (name ?? 'U').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Overlay base ─────────────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(2,6,19,0.78)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        animation: 'redFadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto',
          borderRadius: RADIUS.xl, background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))',
          border: `1px solid ${C.cyanDim}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        {children}
      </div>
      <style>{`@keyframes redFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Cerrar"
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 2,
        width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cyanDim}`, color: C.cyan,
      }}
    >
      <X size={16} />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1) COMPARTIR CREDENCIAL — QR + link
// ════════════════════════════════════════════════════════════════════════════
export function ShareCredentialModal({ username, fullName, onClose }: {
  username: string; fullName?: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const link = profileLink(username);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(link)}`;

  const [passportUrl, setPassportUrl] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copiedP, setCopiedP] = useState(false);

  async function generatePassport() {
    setIssuing(true);
    try {
      const { data, error } = await supabase.functions.invoke('credential', { body: { action: 'issue' } });
      const d = data as { token?: string; error?: string };
      if (error || !d?.token) return;
      const base = `${window.location.origin}${window.location.pathname}`;
      setPassportUrl(`${base}?verificar=${d.token}`);
    } finally {
      setIssuing(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Credencial de ${fullName ?? username} · Ómicrom`,
          text: 'Mira mi Gemelo Digital en Ómicrom',
          url: link,
        });
      } catch { /* cancelado */ }
    } else {
      copy();
    }
  }

  return (
    <Overlay onClose={onClose}>
      <CloseBtn onClose={onClose} />
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Share2 size={16} style={{ color: C.cyan }} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: '#eaf4ff' }}>
            Comparte tu credencial
          </span>
        </div>
        <p style={{ margin: '0 0 18px', fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim, lineHeight: 1.4 }}>
          Muestra este QR en persona o envía el link. Quien lo abra verá tu Gemelo Digital y podrá conectar contigo.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ padding: 12, borderRadius: 16, background: '#fff', boxShadow: `0 0 22px ${C.cyan}33` }}>
            <img
              src={qrSrc}
              alt="Código QR de tu credencial"
              width={220}
              height={220}
              style={{ display: 'block', width: 220, height: 220 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
          <QrCode size={13} style={{ color: C.cyanDim }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, letterSpacing: 1 }}>
            @{username}
          </span>
        </div>

        <button
          onClick={nativeShare}
          style={{
            width: '100%', padding: '13px', borderRadius: RADIUS.lg, cursor: 'pointer',
            background: C.cyan, border: 'none', color: '#021018',
            fontFamily: FONT.display, fontWeight: 700, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
          }}
        >
          <Share2 size={16} /> Compartir link
        </button>
        <button
          onClick={copy}
          style={{
            width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer',
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.cyanDim}`, color: C.cyan,
            fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'COPIADO' : 'COPIAR LINK'}
        </button>

        <div style={{ height: 1, background: C.cyanFaint, margin: '18px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={15} style={{ color: C.green }} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Pasaporte Verificable</span>
        </div>
        <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim, lineHeight: 1.4 }}>
          Credencial firmada: quien la reciba puede comprobar que es auténtica y no fue alterada, <b>sin necesidad de cuenta</b>.
        </p>
        {!passportUrl ? (
          <button onClick={generatePassport} disabled={issuing}
            style={{ width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer', background: 'rgba(57,255,20,0.12)', border: `1px solid ${C.greenDim}`, color: C.green, fontFamily: FONT.display, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {issuing ? <Loader2 size={16} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> : <ShieldCheck size={16} />}
            {issuing ? 'Firmando...' : 'Generar Pasaporte Verificable'}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ padding: 10, borderRadius: 14, background: '#fff', boxShadow: `0 0 22px ${C.green}33` }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(passportUrl)}`} width={190} height={190} alt="QR Pasaporte Verificable" style={{ display: 'block', width: 190, height: 190 }} />
              </div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(passportUrl); setCopiedP(true); setTimeout(() => setCopiedP(false), 2000); }}
              style={{ width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.greenDim}`, color: C.green, fontFamily: FONT.mono, fontSize: 12, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {copiedP ? <Check size={15} /> : <Copy size={15} />} {copiedP ? 'COPIADO' : 'COPIAR LINK VERIFICABLE'}
            </button>
          </>
        )}
      </div>
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2) CREDENCIAL PÚBLICA — lo que ve quien escanea + botón conectar
// ════════════════════════════════════════════════════════════════════════════
interface PublicCred {
  id: string; username: string; full_name: string; avatar_url: string | null;
  bio: string | null; location: string | null; node_type: string; node_level: number;
  is_verified_professional: boolean; reputation_score: number;
  execution_score: number; quality_score: number; transcendence_score: number;
  foundation_score: number; pe_points: number; total_contracts_completed: number;
}

type ConnState = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected';

export function PublicCredentialModal({ username, onClose }: { username: string; onClose: () => void }) {
  const { profile } = useApp();
  const [cred, setCred] = useState<PublicCred | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [conn, setConn] = useState<ConnState>('none');
  const [connId, setConnId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async (otherId: string) => {
    const { data } = await supabase.rpc('connection_status', { p_other: otherId });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) { setConn('none'); setConnId(null); return; }
    setConnId(row.connection_id ?? null);
    if (row.status === 'accepted') setConn('accepted');
    else if (row.status === 'rejected') setConn('rejected');
    else if (row.status === 'pending') setConn(row.direction === 'sent' ? 'pending_sent' : 'pending_received');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_public_credential', { p_username: username });
      const row = Array.isArray(data) ? data[0] : null;
      if (!alive) return;
      if (error || !row) { setNotFound(true); setLoading(false); return; }
      const c: PublicCred = {
        id: row.id,
        username: row.username,
        full_name: row.full_name ?? row.username,
        avatar_url: row.avatar_url,
        bio: row.bio,
        location: row.location,
        node_type: row.node_type ?? 'Nodo Operativo',
        node_level: Number(row.node_level ?? 1),
        is_verified_professional: !!row.is_verified_professional,
        reputation_score: Number(row.reputation_score ?? 0),
        execution_score: Number(row.execution_score ?? 0),
        quality_score: Number(row.quality_score ?? 0),
        transcendence_score: Number(row.transcendence_score ?? 0),
        foundation_score: Number(row.foundation_score ?? 0),
        pe_points: Number(row.pe_points ?? 0),
        total_contracts_completed: Number(row.total_contracts_completed ?? 0),
      };
      setCred(c);
      setLoading(false);
      if (profile && profile.id !== c.id) loadStatus(c.id);
    })();
    return () => { alive = false; };
  }, [username, profile, loadStatus]);

  async function connect() {
    if (!cred) return;
    setBusy(true);
    try {
      if (conn === 'pending_received' && connId) {
        await supabase.rpc('respond_connection_request', { p_connection_id: connId, p_accept: true });
      } else {
        await supabase.rpc('send_connection_request', { p_addressee: cred.id });
      }
      await loadStatus(cred.id);
    } finally {
      setBusy(false);
    }
  }

  const isSelf = !!(profile && cred && profile.id === cred.id);

  const gemelo: GemeloDigital | null = cred ? {
    execution: cred.execution_score,
    quality: cred.quality_score,
    transcendence: cred.transcendence_score,
    foundation: cred.foundation_score,
    overallReputation: cred.reputation_score,
  } : null;

  const r = cred ? rango(cred.reputation_score) : null;

  return (
    <Overlay onClose={onClose}>
      <CloseBtn onClose={onClose} />

      {loading && (
        <div style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Loader2 size={26} style={{ color: C.cyan, animation: 'redSpin 0.9s linear infinite' }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: 1 }}>CARGANDO CREDENCIAL...</span>
          <style>{`@keyframes redSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && notFound && (
        <div style={{ padding: 50, textAlign: 'center' }}>
          <p style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: '#eaf4ff', margin: '0 0 6px' }}>
            Credencial no encontrada
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim, margin: 0 }}>
            El usuario @{username} no existe o el link es inválido.
          </p>
        </div>
      )}

      {!loading && cred && r && gemelo && (
        <div style={{ padding: 20 }}>
          <div style={{ height: 3, borderRadius: 3, marginBottom: 16, background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }} />

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18, overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cred.avatar_url ? '#0a1120' : `linear-gradient(135deg, ${r.color}, ${C.cyan})`,
              color: '#060a12', fontWeight: 700, fontSize: 26, fontFamily: FONT.display,
              boxShadow: `0 0 18px ${r.color}44`,
            }}>
              {cred.avatar_url
                ? <img src={cred.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initialsOf(cred.full_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: '#eaf4ff', lineHeight: 1.1 }}>
                {cred.full_name}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim, marginTop: 2 }}>@{cred.username}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
                  background: `${r.color}14`, border: `1px solid ${r.color}44`,
                }}>
                  <Shield size={11} style={{ color: r.color }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: r.color, letterSpacing: 1 }}>
                    {cred.node_type} · N{cred.node_level}
                  </span>
                </span>
                {cred.is_verified_professional && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 20,
                    background: C.greenFaint, border: `1px solid ${C.greenDim}`,
                  }}>
                    <BadgeCheck size={12} style={{ color: C.green }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.green, letterSpacing: 1 }}>VERIFICADO</span>
                  </span>
                )}
              </div>
              {cred.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>
                  <MapPin size={11} /> {cred.location}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '12px 8px 4px', borderRadius: RADIUS.lg, marginBottom: 16,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 2 }}>
              <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>Reputación</span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: r.color, textShadow: `0 0 14px ${r.color}55` }}>
                {cred.reputation_score.toFixed(1)}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim }}>/100</span>
              <span style={{
                padding: '3px 9px', borderRadius: 20, background: `${r.color}18`, border: `1px solid ${r.color}44`,
                fontFamily: FONT.mono, fontSize: 9, color: r.color, letterSpacing: 1,
              }}>
                {r.emoji} {r.label}
              </span>
            </div>
            <ProgressRadar gemelo={gemelo} size="sm" showHeader={false} showScores={false} showAlert={false} showFooter={false} />
          </div>

          {profile && !isSelf && (() => {
            const mine = [Number(profile.execution_score) || 0, Number(profile.quality_score) || 0, Number(profile.transcendence_score) || 0, Number(profile.foundation_score) || 0];
            const theirs = [cred.execution_score, cred.quality_score, cred.transcendence_score, cred.foundation_score];
            const aff = Math.round(mine.reduce((s, m, i) => s + Math.max(m, theirs[i]), 0) / mine.length);
            const ac = aff >= 75 ? C.green : aff >= 50 ? C.gold : C.cyan;
            return (
              <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: RADIUS.lg, background: `${ac}10`, border: `1px solid ${ac}40` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, color: ac, letterSpacing: 1 }}>AFINIDAD DE COLABORACION</span>
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: ac }}>{aff}%</span>
                </div>
                <p style={{ margin: '6px 0 0', fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, lineHeight: 1.4 }}>
                  Juntos cubren el {aff}% de las 4 dimensiones del Gemelo. Mientras mas alto, mejor se complementan para contratos exigentes.
                </p>
              </div>
            );
          })()}

          {isSelf ? (
            <div style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, padding: 8 }}>
              Esta es tu propia credencial
            </div>
          ) : !profile ? (
            <div style={{ textAlign: 'center', fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim, padding: 8 }}>
              Inicia sesión para conectar con {cred.full_name}.
            </div>
          ) : conn === 'accepted' ? (
            <div style={{
              padding: '13px', borderRadius: RADIUS.lg, background: C.greenFaint, border: `1px solid ${C.greenDim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: C.green,
            }}>
              <Check size={16} /> ¡Conectados!
            </div>
          ) : conn === 'pending_sent' ? (
            <div style={{
              padding: '13px', borderRadius: RADIUS.lg, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.cyanDim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT.mono, fontSize: 12, color: C.cyanDim, letterSpacing: 0.5,
            }}>
              <Clock size={15} /> SOLICITUD ENVIADA
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={busy}
              style={{
                width: '100%', padding: '13px', borderRadius: RADIUS.lg, cursor: busy ? 'wait' : 'pointer',
                background: r.color, border: 'none', color: '#021018',
                fontFamily: FONT.display, fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? <Loader2 size={16} style={{ animation: 'redSpin 0.9s linear infinite' }} /> : <UserPlus size={16} />}
              {conn === 'pending_received' ? 'Aceptar solicitud' : 'Conectar'}
            </button>
          )}
          <style>{`@keyframes redSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </Overlay>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3) GATE deep-link: abre la credencial pública si la URL trae ?perfil=
// ════════════════════════════════════════════════════════════════════════════
export function PublicProfileGate() {
  const { profile } = useApp();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get('perfil');
    if (u) setTarget(u);
  }, []);

  function close() {
    setTarget(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('perfil');
    window.history.replaceState({}, '', url.pathname + url.hash);
  }

  if (!target) return null;
  if (profile && profile.username && profile.username.toLowerCase() === target.toLowerCase()) {
    return null;
  }
  return <PublicCredentialModal username={target} onClose={close} />;
}

// ════════════════════════════════════════════════════════════════════════════
// 4) PANEL "MI RED" + chat directo (DM)
// ════════════════════════════════════════════════════════════════════════════
interface Req { connection_id: string; user_id: string; username: string; full_name: string; avatar_url: string | null; node_type: string; reputation_score: number; }

// Filas crudas devueltas por las funciones RPC de Supabase (sin tipar por el schema).
interface RawConnRow { connection_id?: string; user_id: string; username: string; full_name?: string | null; avatar_url?: string | null; node_type?: string | null; reputation_score?: number | string | null; }
interface LeaderboardRow { user_id: string; username: string; full_name?: string | null; avatar_url?: string | null; reputation_score?: number | string | null; }

function PersonRow({ name, username, avatar, rep, right }: {
  name: string; username: string; avatar: string | null; rep: number; right?: React.ReactNode;
}) {
  const r = rango(rep);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: avatar ? '#0a1120' : `linear-gradient(135deg, ${r.color}, ${C.cyan})`,
        color: '#060a12', fontWeight: 700, fontSize: 15, fontFamily: FONT.display,
      }}>
        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>@{username}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, color: r.color }}>{r.emoji} {rep.toFixed(0)}</span>
        </div>
      </div>
      {right}
    </div>
  );
}

interface DMsg { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; }

export function DirectChatModal({ other, onClose }: {
  other: { id: string; name: string; username: string; avatar: string | null };
  onClose: () => void;
}) {
  const { profile } = useApp();
  const [msgs, setMsgs] = useState<DMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_direct_thread', { p_other: other.id });
    setMsgs((data as DMsg[]) ?? []);
    setLoading(false);
    supabase.rpc('mark_dm_read', { p_other: other.id });
  }, [other.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile) return;
    const ch = supabase.channel(`dm-${profile.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${profile.id}` },
        (payload) => {
          const m = payload.new as DMsg;
          if (m.sender_id === other.id) {
            setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
            supabase.rpc('mark_dm_read', { p_other: other.id });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, other.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send() {
    const content = input.trim();
    if (!content || !profile || sending) return;
    setInput('');
    setSending(true);
    const opt: DMsg = { id: crypto.randomUUID(), sender_id: profile.id, recipient_id: other.id, content, created_at: new Date().toISOString() };
    setMsgs(prev => [...prev, opt]);
    try {
      await supabase.rpc('send_direct_message', { p_recipient: other.id, p_content: content });
      await load();
    } catch {
      setInput(content);
      setMsgs(prev => prev.filter(x => x.id !== opt.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: other.avatar ? '#0a1120' : `linear-gradient(135deg, ${C.cyan}, ${C.green})`,
            color: '#060a12', fontWeight: 700, fontSize: 14, fontFamily: FONT.display,
          }}>
            {other.avatar ? <img src={other.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initialsOf(other.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>{other.name}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>@{other.username} · mensaje directo</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cyanDim}`, color: C.cyan }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 220, maxHeight: '58vh', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>CARGANDO...</div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontFamily: FONT.body, fontSize: 12.5, color: C.cyanDim }}>
              Inicia la conversación con {other.name} 👋
            </div>
          ) : msgs.map((m, i) => {
            const own = m.sender_id === profile?.id;
            return (
              <div key={`${m.id}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px', borderRadius: 12,
                  background: own ? 'rgba(92, 200, 255,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${own ? C.cyanDim : 'rgba(255,255,255,0.08)'}`,
                  borderTopRightRadius: own ? 3 : 12, borderTopLeftRadius: own ? 12 : 3,
                }}>
                  <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 14, color: '#dbeafe', lineHeight: 1.4 }}>{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.cyanFaint}` }}>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(); }}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: FONT.body, fontSize: 14, outline: 'none' }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 11, background: C.cyan, border: 'none', color: '#021018', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || sending ? 0.4 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function RedPanel() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [contacts, setContacts] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dmWith, setDmWith] = useState<Req | null>(null);
  const [top, setTop] = useState<LeaderboardRow[]>([]);
  const [viewUser, setViewUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rq, cn, lb] = await Promise.all([
      supabase.rpc('my_pending_requests'),
      supabase.rpc('my_connections'),
      supabase.rpc('get_leaderboard', { p_limit: 10 }),
    ]);
    setTop((lb.data as LeaderboardRow[]) ?? []);
    const norm = (rows: RawConnRow[]): Req[] => (rows ?? []).map(x => ({
      connection_id: x.connection_id ?? '',
      user_id: x.user_id,
      username: x.username,
      full_name: x.full_name ?? x.username,
      avatar_url: x.avatar_url ?? null,
      node_type: x.node_type ?? 'Nodo Operativo',
      reputation_score: Number(x.reputation_score ?? 0),
    }));
    setRequests(norm(rq.data as RawConnRow[]));
    setContacts(norm(cn.data as RawConnRow[]));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function respond(connId: string, accept: boolean) {
    setBusyId(connId);
    try {
      await supabase.rpc('respond_connection_request', { p_connection_id: connId, p_accept: accept });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{
      position: 'relative', borderRadius: RADIUS.xl, padding: 16, marginBottom: 14,
      background: 'rgba(12,20,38,0.95)', border: '1px solid rgba(92, 200, 255,0.14)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Users size={16} style={{ color: C.cyan }} />
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Mi red</span>
      </div>
      <p style={{ margin: '0 0 14px', fontFamily: FONT.body, fontSize: 11, color: C.cyanDim }}>
        Conecta con técnicos y clientes escaneando su QR o aceptando solicitudes.
      </p>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 14, color: C.cyanDim, fontFamily: FONT.mono, fontSize: 11 }}>
          <Loader2 size={14} style={{ animation: 'redSpin 0.9s linear infinite' }} /> CARGANDO...
          <style>{`@keyframes redSpin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && (
        <>
          {top.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.gold, letterSpacing: 1.5, marginBottom: 6 }}>🏆 RANKING DE NODOS</div>
              {top.map((t, idx) => {
                const rr = rango(Number(t.reputation_score) || 0);
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return (
                  <button key={t.user_id} onClick={() => setViewUser(t.username)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', background: 'none', border: 'none', borderBottom: `1px solid ${C.cyanFaint}`, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 26, textAlign: 'center', fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: idx < 3 ? C.gold : C.cyanDim }}>{medal}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.avatar_url ? '#0a1120' : `linear-gradient(135deg, ${rr.color}, ${C.cyan})`, color: '#060a12', fontWeight: 700, fontFamily: FONT.display, fontSize: 13 }}>
                      {t.avatar_url ? <img src={t.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (t.full_name || t.username || 'U').slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.full_name || t.username}</div>
                      <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>@{t.username}</div>
                    </div>
                    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: rr.color }}>{(Number(t.reputation_score) || 0).toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {requests.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.gold, letterSpacing: 1.5, marginBottom: 4 }}>
                SOLICITUDES ({requests.length})
              </div>
              {requests.map(req => (
                <PersonRow
                  key={req.connection_id}
                  name={req.full_name} username={req.username} avatar={req.avatar_url} rep={req.reputation_score}
                  right={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => respond(req.connection_id, true)}
                        disabled={busyId === req.connection_id}
                        title="Aceptar"
                        style={{ width: 34, height: 34, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.greenFaint, border: `1px solid ${C.greenDim}`, color: C.green }}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => respond(req.connection_id, false)}
                        disabled={busyId === req.connection_id}
                        title="Rechazar"
                        style={{ width: 34, height: 34, borderRadius: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.redFaint, border: `1px solid ${C.redDim}`, color: C.red }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}

          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, letterSpacing: 1.5, marginBottom: 4 }}>
            CONECTADOS ({contacts.length})
          </div>
          {contacts.length === 0 ? (
            <div style={{ padding: '14px 0', textAlign: 'center', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim }}>
              Aún no tienes conexiones. Comparte tu QR para empezar tu red. 🔗
            </div>
          ) : (
            contacts.map(c => (
              <PersonRow key={c.connection_id} name={c.full_name} username={c.username} avatar={c.avatar_url} rep={c.reputation_score}
                right={
                  <button
                    onClick={() => setDmWith(c)}
                    title={`Enviar mensaje a ${c.full_name}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
                      background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, color: C.cyan,
                      fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.5,
                    }}
                  >
                    <MessageCircle size={14} /> MENSAJE
                  </button>
                } />
            ))
          )}
        </>
      )}

      {viewUser && (
        <PublicCredentialModal username={viewUser} onClose={() => { setViewUser(null); load(); }} />
      )}
      {dmWith && (
        <DirectChatModal
          other={{ id: dmWith.user_id, name: dmWith.full_name, username: dmWith.username, avatar: dmWith.avatar_url }}
          onClose={() => setDmWith(null)}
        />
      )}
    </div>
  );
}
