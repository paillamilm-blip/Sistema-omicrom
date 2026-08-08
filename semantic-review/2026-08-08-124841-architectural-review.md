# OpenRouter migration and conversational orb shell

This batch of ~20 PRs migrates the AI backend from Gemini to OpenRouter, replaces the navigation stack with a 3D orb-based shell (OrbShell), adds a proactive greeting engine, and connects the Coach/Tutor IA directly from the browser. The approach is ambitious: a single fullscreen orb with projected HTML labels replaces traditional tabs, while AI calls now bypass Edge Functions entirely for most user-facing interactions.

Watch for: **API key shipped to every browser session** (confirmed) — the `VITE_OPENROUTER_KEY` is compiled into the client bundle and sent with every fetch to OpenRouter, meaning any user can extract it from DevTools. **Credit system fully bypassed** (confirmed) — the frontend calls OpenRouter directly, circumventing the Edge Function credit/rate-limit layer. **Incomplete migration** (confirmed) — `market-match` and `vault-oracle` still call Gemini directly and will break if `GEMINI_API_KEY` is removed.

**Verdict**: NEEDS_CHANGES

## High-level view

The frontend now calls OpenRouter directly from the browser (`oraculo.ts`, `geminiClient.ts`) using an API key injected at build time via `VITE_OPENROUTER_KEY`. This eliminates latency from the Edge Function hop but exposes the key to every client and bypasses the credit/rate-limit system built into the backend. Any user with DevTools open can extract the key and make unlimited free-tier API calls. Since the models used are free-tier, financial exposure is limited today, but the key could be abused for unrelated workloads or hit OpenRouter's per-key rate limits, degrading service for all users.

The Edge Function migration to OpenRouter is partial. Six functions use the shared `_shared/openrouter.ts` client. Two functions (`market-match`, `vault-oracle`) still call the Gemini REST API and will fail silently if `GEMINI_API_KEY` is unset — they were not touched by PR #175's "migrar TODAS" commit.

OrbShell is a ~700-line component that owns navigation state, speech recognition, proactive greeting, text input, preview panels, fullscreen tab rendering, and 3D label projection. The proactive greeting fires on every mount when `sbProfile` changes (which includes re-fetches), so a user returning from a tab can hear the greeting again. A continuous rAF loop also calls `setVoiceLevel` ~10 times/second in idle, forcing unnecessary React reconciliation.

<details>
<summary>Issues (6)</summary>

1. **Browser-exposed OpenRouter API key** — Move AI calls back behind Edge Functions or implement a lightweight proxy that keeps the key server-side. The `VITE_` prefix guarantees the key is in the client bundle.
2. **Credit/rate-limit bypass** — `oraculo.ts` and `geminiClient.ts` call OpenRouter without touching `checkAndConsumeCredit` or `checkRateLimit`. Users get unlimited AI interactions from the browser regardless of their tier.
3. **Incomplete OpenRouter migration** — `market-match` and `vault-oracle` still use `GEMINI_API_KEY` and the Gemini REST endpoint. Either migrate them to `_shared/openrouter.ts` or document that they intentionally remain on Gemini.
4. **Proactive greeting re-fires on profile refetch** — The `useEffect` in OrbShell depends on `[sbProfile, gemeloDigital]`, so any profile update (e.g., after validating a skill) re-triggers the greeting and TTS. Gate it with a `hasGreeted` ref.
5. **OrbShell voiceLevel rAF runs continuously in idle** — The throttled rAF loop calls `setVoiceLevel` every 100ms even when no user interaction is happening, triggering re-renders. Use CSS animation or a ref instead of state for the idle breathing pulse.
6. **Coach Edge Function credit check uses admin client without user context** — `checkAndConsumeCredit` receives `_admin` (service role) and `authHeader`, but the RPC `check_and_consume_credit` resolves `auth.uid()` internally. Since it's called with the admin client (not the user client), `auth.uid()` will be null and the credit check may always fail-open.

</details>

<details>
<summary>Details</summary>

## API key in the client bundle

`oraculo.ts` line 83 reads `import.meta.env.VITE_OPENROUTER_KEY` and uses it in `callOpenRouter()` to make direct `fetch` calls to `https://openrouter.ai/api/v1/chat/completions`. Vite's design guarantees that any env var prefixed `VITE_` is inlined into the production JavaScript bundle. The same pattern exists in `geminiClient.ts` (line 6).

The key appears in the `Authorization: Bearer ...` header of every request the browser makes:

```typescript
headers: {
  'Authorization': `Bearer ${OR_KEY}`,   // visible in Network tab
  ...
}
```

An attacker extracting this key could exhaust the per-key rate limit, causing `OpenRouter no respondio` errors for legitimate users. If the account is later upgraded to paid models, the exposure becomes financial.

## Credit system rendered irrelevant

The frontend's `askCoach` and `askTutor` in `oraculo.ts` (and `analyzeCVWithGemini` in `geminiClient.ts`) call OpenRouter directly — no credit check, no rate limit. The comment in oraculo.ts confirms the intent: "llama DIRECTO a OpenRouter desde el browser."

This means:
- Free-tier users bypass the daily credit cap entirely.
- The `is_premium` distinction in `iaCredits.ts` has no effect for Coach/Tutor interactions initiated from OrbShell, AcademiaTab's modals, or MaxSkillTab's Coach button.
- The Edge Function `coach` endpoint is effectively dead code for these flows — nothing in the frontend calls it anymore.

## Incomplete Gemini-to-OpenRouter migration

PR #175 commit message says "migrar TODAS las Edge Functions de Gemini → OpenRouter", but two functions were missed:

- `supabase/functions/market-match/index.ts` — still uses `GEMINI_API_KEY` and calls `generativelanguage.googleapis.com`
- `supabase/functions/vault-oracle/index.ts` — same pattern

If the team removes `GEMINI_API_KEY` from Supabase secrets (believing the migration is complete), these functions will return 500 errors.

## Proactive greeting lifecycle

```typescript
useEffect(() => {
  if (!sbProfile) return;
  const timer = setTimeout(() => {
    // ... evaluateProactiveEvents or computeSteps fallback
    setResponseMsg(msg);
    speak(msg);
  }, 1500);
  return () => clearTimeout(timer);
}, [sbProfile, gemeloDigital]);
```

This effect re-runs whenever the profile object reference changes. Supabase realtime subscriptions or manual `refreshProfile()` calls create a new object, re-triggering the greeting. The TTS (`speak`) call means the user hears the greeting again mid-session. A `useRef(false)` guard (`if (hasGreeted.current) return; hasGreeted.current = true;`) would prevent this.

## Idle render churn in OrbShell

When `state === 'orb'` and the user is not listening, a `requestAnimationFrame` loop runs continuously:

```typescript
const throttled = (ts: number) => {
  if (!running) return;
  if (ts - last > 100) { last = ts; setVoiceLevel(Math.sin(ts * 0.002) * 0.05 + 0.05); }
  rafRef.current = requestAnimationFrame(throttled);
};
```

This calls `setVoiceLevel` (a state setter) ~10 times/second even in idle, forcing React to reconcile the component tree each time. The `voiceLevel` value drives the `OrbNeuronal` component's props. Since the idle breathing is purely cosmetic (amplitude 0.05), it should be pushed into the Three.js animation loop via a ref rather than React state.

## Coach Edge Function credit check context

In `coach/index.ts`:

```typescript
const _admin = createClient(SUPABASE_URL, SERVICE_KEY);
// ...
const creditBlock = await checkAndConsumeCredit(_admin, authHeader, 'coach');
```

Inside `iaCredits.ts`, `checkAndConsumeCredit` calls `adminClient.rpc('check_and_consume_credit', ...)`. Since `_admin` uses the service role key (not the user's JWT), PostgreSQL's `auth.uid()` inside the RPC will resolve to null unless the RPC explicitly trusts a parameter. The code works today only because the RPC error triggers the `fail-open` path: `console.warn('[iaCredits] RPC error (fail-open):', error.message); return null;`. This means credits are never actually consumed for the coach endpoint — it always permits the call.

</details>

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `src/lib/oraculo.ts` | Added `callOpenRouter` browser-direct client; `askCoach`/`askTutor` bypass Edge Functions |
| `src/lib/geminiClient.ts` | Migrated from Gemini to OpenRouter (same browser-direct pattern) |
| `src/components/omicron/OrbShell.tsx` | Complete rewrite: orb navigation, proactive greeting, text/voice input, preview/fullscreen states |
| `src/components/omicron/ParticleOrb.tsx` | Replaced helix with Fibonacci sphere; fixed GLSL `active` reserved word |
| `src/components/tabs/PerfilTab.tsx` | New "Mi ADN Digital" orbital visualization replacing flat profile cards |
| `src/components/tabs/MaxSkillTab.tsx` | Skill Genome v2: radar chart, soft skills, Coach IA integration |
| `src/components/tabs/AcademiaTab.tsx` | Coach/Tutor modals now call `oraculo.ts` directly (no Edge Function) |
| `src/lib/omicronCoach.ts` | Deterministic improvement engine; `computeSteps` and `nodeGuidance` |
| `supabase/functions/_shared/openrouter.ts` | New shared LLM client for Edge Functions (model fallback, JSON mode) |
| `supabase/functions/coach/index.ts` | Migrated to OpenRouter; uses body data instead of RPC for context |
| `supabase/functions/simulador-universal/index.ts` | Migrated to OpenRouter; adaptive difficulty engine |
| `supabase/functions/market-match/index.ts` | **NOT migrated** — still uses Gemini API |
| `supabase/functions/vault-oracle/index.ts` | **NOT migrated** — still uses Gemini API |

[Full diff: `git diff 9795435..0100b6b`]

</details>
