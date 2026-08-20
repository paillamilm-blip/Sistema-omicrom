// ═══════════════════════════════════════════════════════════════════════
// Feature: GEMELO DIGITAL
//
// Todo lo que ERES y todo lo que PODRÍAS SER.
// Identidad, reputación, competencias, credenciales, red social,
// visualización, progreso, memoria, y lógica de mejora.
//
// Conceptualmente: Ómicron = tu coach (te empuja), Gemelo = tú (te mide).
// ═══════════════════════════════════════════════════════════════════════

// ── Services (lógica de dominio) ─────────────────────────────────────
export * from './services/profile';
export * from './services/memory';
export * from './services/comprador';
export * from './services/progressive';
export * from './services/proactive';
export * from './services/reputation';
export * from './services/cvAnalyzer';
export * from './services/cvExtract';

// ── Hooks ────────────────────────────────────────────────────────────
export { useGemeloProfile } from './hooks/useGemeloProfile';
