// supabase/functions/market-match/index.ts — Asesor IA de Contratación (Ómicrom).
// SINERGIA: Conoce al COMPRADOR (sus ejes, skills, competencias) para recomendar
// talento que complementa su equipo, no solo por relevancia de búsqueda.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { authenticateUser, getUserContext } from '../_shared/userContext.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'El Asesor IA no está configurado (falta GEMINI_API_KEY).' }, 500);

    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ error: 'Inicia sesión para usar el Asesor IA.' }, 401);

    const rl = await checkRateLimit(admin, 'market-match', clientIp(req), 12, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? '').toString().trim();
    if (!query) return json({ error: 'Describe qué necesitas contratar.' }, 400);

    // SINERGIA: contexto del comprador para matching inteligente
    const buyerCtx = await getUserContext(admin, uid);
    const buyerInfo = buyerCtx
      ? `PERFIL DEL COMPRADOR: ${buyerCtx.nodeType} N${buyerCtx.nodeLevel}, ` +
        `skills: ${buyerCtx.skills.slice(0, 6).join(', ') || 'no declaradas'}, ` +
        `competencias: ${buyerCtx.competenciasValidadas.slice(0, 5).join(', ') || 'ninguna'}. ` +
        `Busca talento que COMPLEMENTE lo que no tiene.`
      : '';

    // Servicios activos
    const { data: svcs } = await admin
      .from('market_services')
      .select('id, title, description, category, price, seller_id')
      .eq('is_active', true)
      .not('seller_id', 'is', null)
      .limit(25);

    const services = svcs ?? [];
    if (services.length === 0) {
      return json({ recomendacion: 'Todavía no hay talento suficiente en el Mercado.' });
    }

    // Perfiles + evidencia de vendedores
    const sellerIds = [...new Set(services.map((s: any) => s.seller_id))];
    const { data: profs } = await admin
      .from('profiles')
      .select('id, username, full_name, node_type, node_level, reputation_score, skills')
      .in('id', sellerIds);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const { data: actas } = await admin
      .from('actas_evidencia')
      .select('user_id, nodo:skill_tree_nodes(title)')
      .in('user_id', sellerIds)
      .eq('veredicto', 'APROBADO');
    const compMap = new Map<string, string[]>();
    (actas ?? []).forEach((a: any) => {
      const t = a.nodo?.title; if (!t) return;
      const arr = compMap.get(a.user_id) ?? []; if (!arr.includes(t)) arr.push(t);
      compMap.set(a.user_id, arr);
    });

    const catalogo = services.map((s: any, i: number) => {
      const p = profMap.get(s.seller_id) as any;
      const comps = compMap.get(s.seller_id) ?? [];
      const skills = Array.isArray(p?.skills) ? p.skills.slice(0, 5).join(', ') : '';
      return `#${i + 1} · "${s.title}" (${s.category}, ${s.price}T) — @${p?.username ?? '?'} ` +
        `(${p?.node_type ?? 'Nodo'} N${p?.node_level ?? 1}, rep ${Math.round(p?.reputation_score ?? 0)}/100` +
        (skills ? `, skills: ${skills}` : '') +
        (comps.length ? `, validadas: ${comps.slice(0, 4).join(', ')}` : '') + ')';
    }).join('\n');

    const sys =
      'Eres el Asesor de Contratación IA de Omicrom, parte de un sistema de APRENDIZAJE CONTINUO. ' +
      'Ayudas al comprador a elegir talento priorizando EVIDENCIA (reputación + competencias validadas). ' +
      'CONSIDERA el perfil del comprador: recomienda talento que COMPLEMENTE sus skills (no que duplique). ' +
      'Recomienda 1 a 3 opciones, explica POR QUÉ cada una calza con la necesidad Y el perfil del comprador. ' +
      'Español, claro y breve (~150 palabras). Sin markdown.';
    const user =
      `NECESIDAD: ${query}\n\n${buyerInfo}\n\nCATÁLOGO:\n${catalogo}\n\nRecomendación:`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const rec = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ recomendacion: rec || 'No pude generar una recomendación.', total: services.length });
  } catch (e) {
    return json({ error: 'Error inesperado en el Asesor IA.', detail: String(e) }, 500);
  }
});
