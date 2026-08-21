# Full Jarvis Synergy — Emotion Bridge, Ambient Drone, and Motion Integration

This commit wires the "Jarvis Presence" system end-to-end: an `EmotionBridge` component replaces the bare `EmotionProvider`, reads real profile data to compute emotion signals, feeds those to the existing emotion-aware CSS variables, spawns ambient particles at the app root, and drives a new Web Audio drone that morphs with emotional state. Simultaneously, the motion library's showcase components (`GlowCard`, `MagneticButton`, `SmoothNumber`, `TextReveal`, `CelebrationBurst`, `StaggerList`) are wired into production tabs (GemeloTab, WalletTab, AcademiaTab, Guidance), and two new hooks (`useGemeloAging`, `useProgressiveBlur`) are created but not yet consumed.

Watch for: `DroneSync` calls `ambientDrone.setEmotion()` on every render of its parent (confirmed) — it's idempotent only by accident of a string equality guard, but the call still runs unconditionally in the render phase. Two hooks ship as dead code. The profile type lacks `streak_days` and `last_active_at` fields, so `EmotionBridge` currently always computes `streakDays=0` and `daysSinceLastActivity=0` unless those columns exist in Supabase but not in the TypeScript type (possible). Audio spam from `LivePresence` is gated by the `lastId` deduplication check so it's safe at the current event frequency, but rapid bursts from a busy network channel have no throttle.

**Verdict**: APPROVED

## High-level view

EmotionBridge sits inside `AppProvider` (has access to `useApp()`), derives emotion signals from the profile, and wraps children in `EmotionProvider`. It also renders `EmotionParticles` (fixed-position, `pointerEvents: none`, outside any scroll container) and a `DroneSync` null-component that side-effects the ambient audio singleton. `DroneSync` runs its side effect during render rather than in `useEffect` — harmless today due to the equality guard, but fragile under strict/concurrent mode.

The motion components are wired with correct props and types throughout. The two dead hooks (`useGemeloAging`, `useProgressiveBlur`) are well-designed but unreachable — tree-shaking will eliminate them from production, but they represent untracked feature stubs.

The `useMemo` in EmotionBridge writes to `sessionStorage`, violating the purity contract. The profile type doesn't declare `streak_days` or `last_active_at`, so the emotion system currently operates at reduced fidelity — only PE changes and node upgrades shift the emotion away from the default `'engaged'`.

<details>
<summary>Issues (6)</summary>

1. **DroneSync render-phase side effect** — `ambientDrone.setEmotion(emotion)` runs during render, not inside `useEffect`. Wrap in `useEffect(() => { ambientDrone.setEmotion(emotion); }, [emotion])` so it's safe under React Strict Mode and concurrent rendering. (confirmed)
2. **Missing profile fields for emotion signals** — `streak_days` and `last_active_at` do not exist on the `Profile` TypeScript type. EmotionBridge casts through `unknown` to access them, meaning signals always resolve to `streakDays=0` and `daysSinceLastActivity=0` unless Supabase returns these columns without type coverage. Either add the fields to the type or document that they're future-proofing. (confirmed)
3. **Dead hooks** — `useGemeloAging` and `useProgressiveBlur` are created but not imported anywhere. They add ~155 lines of untested, unreachable code. Tree-shaking will likely eliminate them, but they should either be wired in or deferred to a follow-up. (confirmed)
4. **No throttle on audioPing in LivePresence** — The `lastId` guard prevents duplicate pings for the same event, but if the network channel delivers 10 distinct events in rapid succession, all 10 will fire `audioPing()` with no cooldown. Add a minimum interval (e.g., 3s) between pings. (likely)
5. **Ambient drone AudioContext lifecycle** — The drone creates its own `AudioContext` separate from `omicronAudio`'s. On iOS Safari, each context counts toward the browser's limit. Consider reusing the existing singleton's context. (possible)
6. **sessionStorage side effects in useMemo** — `EmotionBridge`'s `useMemo` writes to `sessionStorage` (setting `omicron_session_pe` and `omicron_session_node`). `useMemo` is not guaranteed to run exactly once or at predictable times. These writes should be in a `useEffect`. (confirmed)

</details>

<details>
<summary>Details</summary>

## EmotionBridge signal computation and render-phase effects

The profile fields `streak_days` and `last_active_at` are accessed via `as unknown as Record<string, unknown>` because they don't exist on the type:

```tsx
const streakDays = (profile as unknown as Record<string, unknown>).streak_days as number | undefined ?? 0;
const lastActive = (profile as unknown as Record<string, unknown>).last_active_at as string | undefined;
```

This means the emotion signal is effectively always `computeEmotion({ streakDays: 0, daysSinceLastActivity: 0, recentAchievement: ..., recentLevelUp: ... })`. Only PE increase or node change triggers `'proud'` or `'onFire'`; streak and inactivity detection are inert until those fields exist on the profile.

The `useMemo` writes to `sessionStorage` on every invocation. React's contract allows `useMemo` to re-execute (Strict Mode double-renders, cache eviction). The values written are idempotent, but memos should be pure — these writes belong in a `useEffect` synchronized on `profile.pe_points` and the node type.

`DroneSync`:

```tsx
function DroneSync() {
  const { emotion } = useEmotion();
  ambientDrone.setEmotion(emotion);
  return null;
}
```

`setEmotion` early-returns when `emotion === this.currentEmotion`, so repeated render calls are no-ops. But React may call render without committing (concurrent mode, Suspense). Moving this into `useEffect` is a one-line fix that eliminates the fragility.

## LivePresence audio ping frequency

```tsx
useEffect(() => {
  const e = events[0];
  if (e && e.id !== lastId.current) {
    lastId.current = e.id;
    setCurrent(e);
    firePulse('active');
    audioPing();
    const t = setTimeout(() => setCurrent(null), 4600);
    return () => clearTimeout(t);
  }
}, [events]);
```

Distinct events arriving in rapid succession (e.g., 5 users join in 3 seconds) will each trigger `audioPing()`. The ping is 80ms with exponentialRamp decay, so overlapping pings produce additive volume. At realistic network activity this is fine; during burst traffic (onboarding events, load tests) it becomes an audible rapid-fire chirp. A cooldown ref (`if (Date.now() - lastPingTime.current < 3000) return`) would make this robust.

## Ambient drone — dual AudioContext

The `AmbientDrone` class creates its own `AudioContext` in `init()`. The existing `OmicronAudio` singleton also creates one. iOS Safari limits the number of `AudioContext` instances (historically 4–6). In practice this app will have exactly 2, which is safe, but sharing a single context would be cleaner. The drone already imports `omicronAudio` to check `isMuted` — exposing `omicronAudio`'s context via a getter would allow the drone to reuse it.

</details>

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `src/App.tsx` | Replace `EmotionProvider` with `EmotionBridge` wrapper |
| `src/shared/components/EmotionBridge.tsx` | New: reads profile, computes signals, wraps EmotionProvider + particles + drone sync |
| `src/shared/utils/ambientDrone.ts` | New: Web Audio singleton that morphs a low-frequency drone based on emotion state |
| `src/shared/motion/StaggerList.tsx` | New: convenience `StaggerList`/`StaggerItem` wrappers over framer-motion variants |
| `src/shared/motion/index.ts` | Export StaggerList and StaggerItem |
| `src/shared/hooks/useGemeloAging.ts` | New: hook computing visual freshness from inactivity (unused) |
| `src/shared/hooks/useProgressiveBlur.ts` | New: hook for blur-on-first-visit effect (unused) |
| `src/features/wallet/components/WalletTab.tsx` | Wire SmoothNumber (balance, escrow, PE) and StaggerList for transactions |
| `src/features/gemelo/components/GemeloTab.tsx` | Wire GlowCard on axis cards, SmoothNumber on reputation, MagneticButton on shortcuts |
| `src/features/gemelo/components/Guidance.tsx` | Wire TextReveal on guidance text |
| `src/features/gemelo/components/LivePresence.tsx` | Add firePulse + audioPing on network events |
| `src/features/academia/components/AcademiaTab.tsx` | Add CelebrationBurst on exam pass |

Full diff: `git diff 7170a5a..9fe6bff`

</details>
