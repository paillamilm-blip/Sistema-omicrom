// supabase/functions/analizar-cv/index.ts
// Motor ADN Digital — Analiza CV con OpenRouter (gratis).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { callLLM, hasKey } from '../_shared/openrouter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

import { corsHeaders } from '../_shared/cors.ts';
const CORS = corsHeaders();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

async function rateLimited(req: Request): Promise<Response | null> {
  if (!_admin) return null;
  try {
    const { data, error } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analizar-cv',
      p_identifier: clientIp(req),
      p_limit: 6,
      p_window_sec: 60,
    });
    if (error || !data) return null;
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Demasiados intentos. Espera unos segundos.', retry_at: r.reset_at ?? null }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '30' } },
      );
    }
    return null;
  } catch { return null; }
}

const SYS = 'Eres el Motor de ADN Digital de Omicron. Tu mision: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de reputacion de Omicron.\n\nCONTEXTO DEL SISTEMA OMICRON:\nOmicron mide a cada persona con 4 EJES de 0-100 basados en EVIDENCIA REAL:\n- EJECUCION (exec): Capacidad de ENTREGAR. Proyectos completados, anios activos, roles de produccion, resultados medibles.\n- CALIDAD (qual): RIGOR profesional. Certificaciones, estandares cumplidos, metodologias, buenas practicas, nivel de responsabilidad.\n- TRASCENDENCIA (trans): IMPACTO mas alla de uno mismo. Liderazgo de equipos, mentoria, docencia, publicaciones, cargos de responsabilidad sobre personas.\n- FUNDAMENTO (fund): BASE teorica y formal. Titulos universitarios, diplomados, certificaciones tecnicas, especializaciones.\n\nFormula: reputacion = 20% credenciales formales + 80% promedio(4 ejes). Un titulo ayuda (20%) pero el 80% se gana DEMOSTRANDO.\n\nTU TRABAJO:\n1. CLONAR el CV: extraer TODA la informacion tal como es. NO omitir nada. NO inventar nada.\n2. POSICIONAR como especialista: seniorLabel = POSICIONAMIENTO REAL basado en EXPERIENCIA DOMINANTE.\n3. MEDIR con los 4 ejes de Omicron basandote en EVIDENCIA CONCRETA del CV.\n\nREGLAS:\n- NO inventes NADA que no este en el texto.\n- NO subestimes: si tiene 15 anios, refleja 15 anios.\n- Los skills deben ser los que REALMENTE domina segun su trayectoria.\n- Los porcentajes (pct) DEBEN diferenciarse: area principal 80-96%, secundarias 50-75%, menores 30-50%.\n- Los anios son la SUMA TOTAL de experiencia laboral.\n- Funciona para CUALQUIER industria.\n\nDevuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues):\n{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":""}';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!hasKey()) return json({ ok: false, error: 'Falta OPENROUTER_KEY en secrets.' }, 500);

    const limited = await rateLimited(req);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    const raw = await callLLM([
      { role: 'system', content: SYS },
      { role: 'user', content: 'CV COMPLETO:\n\n' + cv },
    ], true, 2000);

    if (!raw) {
      return json({ ok: false, error: 'La IA no genero respuesta.' }, 502);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      // Try extracting JSON from text
      const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) {
        try { parsed = JSON.parse(raw.slice(a, b + 1)); } catch {
          return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502);
        }
      } else {
        return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502);
      }
    }

    console.log(`[analizar-cv] OK, nombre: ${(parsed as {name?:string})?.name ?? '?'}`);
    return json({ ok: true, analysis: parsed, model: 'openrouter' });
  } catch (e) {
    console.error('[analizar-cv] Error fatal:', String(e));
    return json({ ok: false, error: 'Error inesperado.', detail: String(e) }, 500);
  }
});
