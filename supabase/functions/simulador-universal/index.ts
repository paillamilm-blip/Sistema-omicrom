// supabase/functions/simulador-universal/index.ts
// ═══════════════════════════════════════════════════════════════════════
// SIMULADOR UNIVERSAL ADAPTATIVO — Motor único de validación de competencias.
//
// Reemplaza examen-ia + run-code con un motor inteligente que:
// 1. Detecta la disciplina del nodo (software, ingeniería, diseño, gestión)
// 2. Selecciona el modo correcto (CÓDIGO, ANÁLISIS, MIXTO) automáticamente
// 3. Adapta la dificultad al nivel REAL del usuario (Zone of Proximal Development)
// 4. Evalúa los 4 ejes del Gemelo Digital en cada intento
// 5. Da feedback accionable para mejorar eficientemente
//
// Acciones: 'iniciar' | 'enviar' | 'defensa' | 'evaluar'
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PISTON_URL = (Deno.env.get('PISTON_URL') ?? 'https://emkc.org/api/v2/piston').replace(/\/+$/, '');

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });



// ═══ UTILIDADES ═══════════════════════════════════════════════════════

async function gemini(systemText: string, userText: string, jsonMode = true): Promise<string> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          thinkingConfig: { thinkingBudget: 0 },
          ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message ?? 'Gemini error');
  const parts = data?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('') : '';
}

function parseJson(text: string): any {
  try { return JSON.parse(text); } catch { /* */ }
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch { /* */ } }
  return null;
}

const clamp = (n: any) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}



// ═══ DETECCIÓN DE MODO Y DIFICULTAD ══════════════════════════════════

type SimMode = 'CODIGO' | 'ANALISIS' | 'MIXTO';

const SOFTWARE_CATEGORIES = ['SOFTWARE', 'DATA', 'PROGRAMMING', 'FOUNDATION'];

function detectMode(nodeCategory: string, hasCodeTests: boolean): SimMode {
  const isSoftware = SOFTWARE_CATEGORIES.includes(nodeCategory.toUpperCase());
  if (isSoftware && hasCodeTests) return 'CODIGO';
  if (isSoftware && !hasCodeTests) return 'MIXTO';
  return 'ANALISIS';
}

interface DifficultyContext {
  foundationScore: number;
  recentAttempts: Array<{ result: string; score: number }>;
  nodeDifficulty: number;
}

function calculateAdaptiveDifficulty(ctx: DifficultyContext): { level: number; label: string } {
  const { foundationScore, recentAttempts, nodeDifficulty } = ctx;

  // Base: nivel del usuario por su foundation_score
  let base = foundationScore < 30 ? 1 : foundationScore < 50 ? 2 : foundationScore < 70 ? 3 : foundationScore < 85 ? 4 : 5;

  // Ajuste por tasa de éxito reciente (Zone of Proximal Development)
  if (recentAttempts.length >= 3) {
    const passRate = recentAttempts.filter(a => a.result === 'PASS' || a.result === 'APROBADO' || a.score >= 70).length / recentAttempts.length;
    if (passRate >= 0.8) base = Math.min(5, base + 1); // Demasiado fácil → subir
    else if (passRate <= 0.3) base = Math.max(1, base - 1); // Demasiado difícil → bajar
    // Entre 0.3 y 0.8 → zona óptima, mantener
  }

  // Considerar dificultad intrínseca del nodo
  const final = Math.max(1, Math.min(5, Math.round((base + nodeDifficulty) / 2)));

  const labels: Record<number, string> = {
    1: 'principiante — problemas simples, explicaciones claras, guía paso a paso',
    2: 'intermedio — requiere aplicar conceptos en situaciones reales',
    3: 'avanzado — análisis profundo, trade-offs, optimización',
    4: 'experto — problemas abiertos, diseño de sistema, decisiones de arquitectura',
    5: 'maestro — contribución original, liderazgo técnico, evaluación crítica',
  };

  return { level: final, label: labels[final] ?? labels[3] };
}



// ═══ EJECUCIÓN DE CÓDIGO EN SANDBOX (PISTON) ═════════════════════════

const HARNESS = `
const fs = require('fs');
const vm = require('vm');
function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch (_) {
    try { return fs.readFileSync('/dev/stdin', 'utf8'); } catch (_) { return ''; }
  }
}
function toStr(v) {
  if (typeof v === 'string') return v;
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  try { if (typeof v === 'object') return JSON.stringify(v); } catch (_) {}
  try { return String(v); } catch (_) { return ''; }
}
(function main() {
  let payload = {};
  try { payload = JSON.parse(readStdin() || '{}'); } catch (_) {}
  const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
  const nonce = String(payload.nonce || 'OMICRON');
  let userCode = '';
  try { userCode = fs.readFileSync('usercode.js', 'utf8'); } catch (_) {}
  const out = []; let fatal = null; let solution = null;
  try {
    const sandbox = { console: { log(){}, error(){}, warn(){}, info(){}, debug(){} } };
    vm.createContext(sandbox);
    vm.runInContext(userCode + "\\n;try{globalThis.__sol=(typeof solution!=='undefined')?solution:undefined;}catch(e){globalThis.__sol=undefined;}", sandbox, { timeout: 2000, filename: 'usercode.js' });
    solution = sandbox.__sol;
    if (typeof solution !== 'function') fatal = 'Define una funcion llamada "solution".';
  } catch (e) { fatal = String((e && e.message) || e); }
  if (typeof solution === 'function' && !fatal) {
    for (let i = 0; i < inputs.length; i++) {
      try { const r = solution(String(inputs[i])); out.push({ ok: true, value: toStr(r) }); }
      catch (e) { out.push({ ok: false, error: String((e && e.message) || e) }); }
    }
  }
  process.stdout.write(nonce + JSON.stringify({ fatal, out }));
})();
`;

async function runCodeInSandbox(code: string, inputs: string[], nonce: string) {
  let _jsVersion: string | null = null;
  try {
    const r = await fetch(`${PISTON_URL}/runtimes`);
    const rts = await r.json() as Array<{ language: string; version: string; aliases?: string[] }>;
    const js = rts.find(x => x.language === 'javascript' || x.language === 'node' || (x.aliases ?? []).includes('javascript'));
    _jsVersion = js?.version ?? '18.15.0';
  } catch { _jsVersion = '18.15.0'; }

  const body = {
    language: 'javascript', version: _jsVersion,
    files: [{ name: 'main.js', content: HARNESS }, { name: 'usercode.js', content: code }],
    stdin: JSON.stringify({ inputs, nonce }),
    compile_timeout: 10000, run_timeout: 5000,
  };

  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(`${PISTON_URL}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res!.status !== 429) break;
    await new Promise(r => setTimeout(r, 1300));
  }
  if (!res || !res.ok) throw new Error(`Sandbox respondio ${res?.status ?? 'sin respuesta'}.`);
  return await res.json();
}



// ═══ HANDLER PRINCIPAL ════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'Simulador no configurado (falta GEMINI_API_KEY).' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para usar el Simulador.' }, 401);

    const rl = await checkRateLimit(admin, 'simulador', clientIp(req), 30, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? 'iniciar';

    // ═══════════ ACCIÓN: INICIAR ═══════════
    if (action === 'iniciar') {
      const nodeId: string = body?.node_id;
      if (!nodeId) return json({ error: 'Falta node_id.' }, 400);

      // Obtener datos del nodo
      const { data: node } = await admin
        .from('skill_tree_nodes')
        .select('id, title, description, category, difficulty_level')
        .eq('id', nodeId).maybeSingle();
      if (!node) return json({ error: 'Nodo no encontrado.' }, 404);

      // Obtener perfil del usuario
      const { data: prof } = await admin
        .from('profiles')
        .select('foundation_score, execution_score, quality_score, transcendence_score, node_level, full_name')
        .eq('id', uid).maybeSingle();

      // Historial de intentos recientes para dificultad adaptativa
      const { data: attempts } = await admin
        .from('skill_test_attempts')
        .select('result, score')
        .eq('user_id', uid)
        .order('attempted_at', { ascending: false })
        .limit(5);

      // ¿Tiene tests de código definidos?
      const { data: codeTests } = await admin
        .from('skill_tests')
        .select('id, test_name, problem_statement, test_cases, time_limit_seconds, passing_score')
        .eq('node_id', nodeId).limit(1);

      const hasCodeTests = (codeTests ?? []).length > 0;
      const mode = detectMode(node.category ?? '', hasCodeTests);

      // Calcular dificultad adaptativa
      const difficulty = calculateAdaptiveDifficulty({
        foundationScore: Number(prof?.foundation_score ?? 50),
        recentAttempts: (attempts ?? []).map(a => ({ result: a.result, score: a.score ?? 0 })),
        nodeDifficulty: node.difficulty_level ?? 3,
      });

      // Generar el reto según el modo
      if (mode === 'CODIGO' && codeTests && codeTests[0]) {
        // Modo código: usar el test predefinido + análisis IA de calidad
        const test = codeTests[0];
        return json({
          session_mode: 'CODIGO',
          node: { id: node.id, title: node.title, category: node.category },
          difficulty,
          code_challenge: {
            test_id: test.id,
            test_name: test.test_name,
            problem_statement: test.problem_statement,
            test_cases: test.test_cases,
            time_limit_seconds: test.time_limit_seconds,
            passing_score: test.passing_score,
          },
          tip: `Nivel adaptado: ${difficulty.label}. Tu código será evaluado por ejecución Y por calidad (legibilidad, eficiencia, buenas prácticas).`,
        });
      }

      // Modo ANÁLISIS o MIXTO: generar reto con IA adaptativa
      const sys =
        'Eres el Simulador Universal de Omicrom: un evaluador experto que valida competencias en CUALQUIER disciplina. ' +
        'Tu rol es generar un RETO ADAPTATIVO que empuje al usuario justo por encima de su nivel actual. ' +
        'El reto debe ser práctico, realista y evaluable objetivamente. Responde SOLO en JSON válido. ' +
        'El idioma es español neutro-chileno.';

      const user =
        `NODO/COMPETENCIA: "${node.title}" (categoría: ${node.category}, dificultad intrínseca: ${node.difficulty_level}/5)\n` +
        `DESCRIPCION: ${node.description ?? '(sin descripción)'}\n` +
        `NIVEL ADAPTATIVO DEL USUARIO: ${difficulty.label}\n` +
        `EJES ACTUALES: Ejecución=${prof?.execution_score ?? 50}, Calidad=${prof?.quality_score ?? 50}, ` +
        `Trascendencia=${prof?.transcendence_score ?? 50}, Fundamento=${prof?.foundation_score ?? 50}\n\n` +
        'Genera un reto con este formato JSON EXACTO:\n' +
        '{\n' +
        '  "titulo": "nombre corto del reto",\n' +
        '  "contexto": "situación real donde se aplica esta competencia (2-3 frases)",\n' +
        '  "preguntas": [{"pregunta":"...","opciones":["a","b","c","d"],"correcta":0,"razon":"..."}],\n' +
        '  "caso_practico": {"enunciado":"descripción del problema a resolver","criterios":["criterio 1","criterio 2","criterio 3"]},\n' +
        '  "pista_adaptativa": "una pista calibrada al nivel del usuario que NO da la respuesta pero guía"\n' +
        '}\n' +
        'Reglas:\n' +
        '- 3 preguntas de opción múltiple (4 opciones, índice "correcta" 0-3)\n' +
        '- 1 caso práctico con 3 criterios de evaluación\n' +
        '- La dificultad debe corresponder EXACTAMENTE al nivel indicado\n' +
        '- Si la categoría es ingeniería/procesos, usa escenarios industriales reales\n' +
        '- Si es diseño, pide decisiones de diseño con trade-offs\n' +
        '- Si es gestión, plantea dilemas de liderazgo con datos';

      const raw = await gemini(sys, user, true);
      const reto = parseJson(raw);
      if (!reto?.preguntas || !reto?.caso_practico) {
        return json({ error: 'No pude generar el reto. Reintenta.', detail: (raw ?? '').slice(0, 300) }, 502);
      }

      // Guardar sesión con la clave (no viaja al cliente)
      const { data: sess, error: se } = await admin
        .from('exam_sessions')
        .insert({ user_id: uid, node_id: nodeId, payload: { node, reto, difficulty, mode }, status: 'OPEN' })
        .select('id').single();
      if (se) return json({ error: 'No pude crear la sesión.', detail: se.message }, 500);

      // Devolver SIN respuestas correctas
      const preguntasSafe = reto.preguntas.map((p: any) => ({ pregunta: p.pregunta, opciones: p.opciones }));
      return json({
        session_id: sess.id,
        session_mode: mode === 'MIXTO' ? 'MIXTO' : 'ANALISIS',
        node: { id: node.id, title: node.title, category: node.category },
        difficulty,
        reto: {
          titulo: reto.titulo,
          contexto: reto.contexto,
          preguntas: preguntasSafe,
          caso_practico: { enunciado: reto.caso_practico.enunciado },
          pista_adaptativa: reto.pista_adaptativa,
        },
      });
    }



    // ═══════════ ACCIÓN: EVALUAR (modo ANÁLISIS/MIXTO) ═══════════
    if (action === 'evaluar') {
      const sessionId: string = body?.session_id;
      const respuestas: number[] = Array.isArray(body?.respuestas) ? body.respuestas : [];
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      const defensaRespuesta: string = (body?.defensa_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload, node_id').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesión no encontrada.' }, 404);

      const reto = sess.payload?.reto;
      const node = sess.payload?.node;
      const difficulty = sess.payload?.difficulty;
      const preguntas = (reto?.preguntas ?? []) as any[];

      // 1) Calificar opción múltiple (determinístico)
      let aciertos = 0;
      preguntas.forEach((p: any, i: number) => { if (respuestas[i] === p.correcta) aciertos++; });
      const mcScore = preguntas.length ? Math.round((aciertos / preguntas.length) * 100) : 0;

      // 2) Evaluar caso + defensa con IA (4 ejes)
      const sys =
        'Eres el Simulador Universal de Omicrom. Evalúas con rigor, justicia y empatía. ' +
        'Tu objetivo es AYUDAR AL USUARIO A MEJORAR, no solo calificarlo. ' +
        'Evalúa los 4 ejes del Gemelo Digital de 0 a 100. Responde SOLO en JSON válido.';

      const user =
        `COMPETENCIA: ${node?.title ?? 'Desconocida'} (categoría: ${node?.category ?? '?'})\n` +
        `NIVEL ADAPTATIVO: ${difficulty?.label ?? 'intermedio'}\n` +
        `CASO: ${reto?.caso_practico?.enunciado ?? '(sin caso)'}\n` +
        `CRITERIOS: ${JSON.stringify(reto?.caso_practico?.criterios ?? [])}\n` +
        `RESPUESTA AL CASO: ${casoRespuesta || '(vacía)'}\n` +
        `DEFENSA (si hubo): ${defensaRespuesta || '(no hubo defensa)'}\n` +
        `OPCIÓN MÚLTIPLE: ${aciertos}/${preguntas.length} (${mcScore}%)\n\n` +
        'Evalúa:\n' +
        '- EJECUCION: ¿resuelve el problema? ¿llega a una solución funcional?\n' +
        '- CALIDAD: ¿es riguroso? ¿considera edge cases? ¿buenas prácticas?\n' +
        '- TRASCENDENCIA: ¿propone mejoras? ¿visión sistémica? ¿reutilizable?\n' +
        '- FUNDAMENTO: ¿demuestra comprensión profunda de los conceptos? (ponderar opción múltiple)\n\n' +
        'Devuelve JSON EXACTO:\n' +
        '{"ejecucion":0,"calidad":0,"trascendencia":0,"fundamento":0,' +
        '"resumen":"2-3 frases sobre el desempeño",' +
        '"feedback":"QUÉ hacer específicamente para mejorar al siguiente nivel",' +
        '"siguiente_paso":"una acción concreta que el usuario debería practicar"}';

      const raw = await gemini(sys, user, true);
      const ev = parseJson(raw) ?? {};
      const ejecucion = clamp(ev.ejecucion);
      const calidad = clamp(ev.calidad);
      const trascendencia = clamp(ev.trascendencia);
      const fundamento = clamp(ev.fundamento != null ? (Number(ev.fundamento) * 0.6 + mcScore * 0.4) : mcScore);
      const puntaje = Math.round((ejecucion + calidad + trascendencia + fundamento) / 4);
      const veredicto = puntaje >= 70 ? 'APROBADO' : 'REPROBADO';

      // 3) Aplicar acta (service role)
      const { data: actaId, error: re } = await admin.rpc('aplicar_acta', {
        p_user_id: uid,
        p_node_id: sess.node_id,
        p_ejecucion: ejecucion,
        p_calidad: calidad,
        p_trascendencia: trascendencia,
        p_fundamento: fundamento,
        p_puntaje: puntaje,
        p_veredicto: veredicto,
        p_resumen: ev.resumen ?? null,
        p_detalle: { respuestas, caso: casoRespuesta, defensa: defensaRespuesta, mc_score: mcScore, feedback: ev.feedback },
      });
      if (re) return json({ error: 'No pude registrar el acta.', detail: re.message }, 500);

      await admin.from('exam_sessions').update({ status: 'EVALUATED' }).eq('id', sessionId);

      return json({
        acta_id: actaId,
        veredicto,
        puntaje_global: puntaje,
        ejes: { ejecucion, calidad, trascendencia, fundamento },
        resumen: ev.resumen ?? '',
        feedback: ev.feedback ?? '',
        siguiente_paso: ev.siguiente_paso ?? '',
        difficulty_applied: difficulty,
      });
    }



    // ═══════════ ACCIÓN: EVALUAR-CODIGO (modo CÓDIGO) ═══════════
    if (action === 'evaluar-codigo') {
      const testId: string = body?.test_id;
      const nodeId: string = body?.node_id;
      const code: string = body?.code ?? '';
      if (!testId || !code) return json({ error: 'Faltan test_id o code.' }, 400);
      if (code.length > 50000) return json({ error: 'Código demasiado largo.' }, 413);

      // Obtener test autoritativo
      const { data: test } = await admin
        .from('skill_tests')
        .select('test_cases, time_limit_seconds, passing_score')
        .eq('id', testId).single();
      if (!test) return json({ error: 'Test no encontrado.' }, 404);

      const testCases = Array.isArray(test.test_cases) ? test.test_cases.slice(0, 50) : [];
      const passingScore = test.passing_score ?? 80;
      const inputs = testCases.map((tc: any) => String(tc.input));

      // Ejecutar en sandbox
      const start = Date.now();
      const nonce = 'OMI_' + crypto.randomUUID().replace(/-/g, '');
      let piston: any;
      try { piston = await runCodeInSandbox(code, inputs, nonce); }
      catch (e) { return json({ result: 'ERROR', score: 0, testCaseResults: [], timeTakenSeconds: 0, pe_awarded: 0, errorMessage: 'Sandbox no disponible: ' + String((e as Error)?.message ?? e) }); }

      const run = piston.run ?? {};
      const stdout = run.stdout ?? '';
      const idx = stdout.lastIndexOf(nonce);
      const results: Array<{ input: string; expected: string; actual: string; passed: boolean; error?: string }> = [];
      let result: string; let score = 0; let fatalMsg: string | undefined;

      if (idx === -1) {
        const killed = run.signal === 'SIGKILL' || run.signal === 'SIGTERM';
        const stderr = (piston.compile?.stderr || run.stderr || '').trim();
        result = killed ? 'TIMEOUT' : 'ERROR';
        fatalMsg = killed ? 'Ejecución detenida por tiempo límite.' : (stderr.slice(0, 400) || piston.message || 'Error de ejecución.');
      } else {
        let parsed: any = { fatal: null, out: [] };
        try { parsed = JSON.parse(stdout.slice(idx + nonce.length)); } catch { parsed = { fatal: 'Salida ilegible.', out: [] }; }
        if (parsed.fatal) { result = 'ERROR'; fatalMsg = String(parsed.fatal).slice(0, 400); }
        else {
          for (let i = 0; i < testCases.length; i++) {
            const expected = String(testCases[i].expected_output);
            const o = parsed.out[i];
            if (!o) results.push({ input: inputs[i], expected, actual: '', passed: false, error: 'Sin salida.' });
            else if (o.ok) { const actual = String(o.value ?? ''); results.push({ input: inputs[i], expected, actual, passed: actual.trim() === expected.trim() }); }
            else results.push({ input: inputs[i], expected, actual: '', passed: false, error: String(o.error ?? 'Error') });
          }
          const passed = results.filter(r => r.passed).length;
          score = testCases.length ? Math.round((passed / testCases.length) * 100) : 0;
          result = score >= passingScore ? 'PASS' : 'FAIL';
        }
      }

      const timeTakenSeconds = Math.round((Date.now() - start) / 1000);

      // Análisis IA de calidad del código (si aprobó los tests)
      let codeQualityFeedback = '';
      if (result === 'PASS') {
        try {
          const qualityRaw = await gemini(
            'Eres un revisor de código experto. Analiza la CALIDAD del código (no si funciona — ya sabemos que sí). Sé breve y accionable.',
            `CÓDIGO:\n${code}\n\nEvalúa: legibilidad, eficiencia, naming, edge cases considerados. Devuelve JSON: {"quality_score":0-100,"feedback":"1 frase de mejora"}`,
            true
          );
          const q = parseJson(qualityRaw);
          if (q?.feedback) codeQualityFeedback = q.feedback;
        } catch { /* no bloquear */ }
      }

      // Persistir intento
      let pe_awarded = 0;
      try {
        const { data: rpc } = await admin.rpc('handle_skill_attempt', {
          p_user_id: uid, p_test_id: testId, p_node_id: nodeId ?? null,
          p_score: score, p_time_sec: timeTakenSeconds, p_code: code, p_result: result, p_tc_results: results,
        });
        pe_awarded = (rpc as any)?.pe_awarded ?? 0;
      } catch { /* no bloquear */ }

      return json({
        result, score, testCaseResults: results, timeTakenSeconds, pe_awarded,
        errorMessage: fatalMsg,
        code_quality_feedback: codeQualityFeedback || undefined,
      });
    }

    // ═══════════ ACCIÓN: DEFENSA ═══════════
    if (action === 'defensa') {
      const sessionId: string = body?.session_id;
      const casoRespuesta: string = (body?.caso_respuesta ?? '').toString();
      if (!sessionId) return json({ error: 'Falta session_id.' }, 400);

      const { data: sess } = await admin
        .from('exam_sessions').select('payload').eq('id', sessionId).eq('user_id', uid).maybeSingle();
      if (!sess) return json({ error: 'Sesión no encontrada.' }, 404);

      const reto = sess.payload?.reto;
      const difficulty = sess.payload?.difficulty;
      const sys =
        'Eres el Simulador Universal. Haces UNA repregunta de defensa, calibrada al nivel del usuario. ' +
        'La pregunta debe verificar comprensión REAL (no memorización). Responde SOLO en JSON.';
      const user =
        `NIVEL: ${difficulty?.label ?? 'intermedio'}\n` +
        `CASO: ${reto?.caso_practico?.enunciado ?? ''}\n` +
        `RESPUESTA: ${casoRespuesta || '(no respondió)'}\n\n` +
        'Devuelve: {"defensa":"tu repregunta aquí","pista":"una orientación sutil sin dar la respuesta"}';
      const raw = await gemini(sys, user, true);
      const out = parseJson(raw);
      return json({
        defensa: out?.defensa ?? 'Explica con tus palabras por qué tu enfoque es el correcto.',
        pista: out?.pista ?? undefined,
      });
    }

    return json({ error: 'Acción no válida. Usa: iniciar, evaluar, evaluar-codigo, defensa.' }, 400);
  } catch (e) {
    return json({ error: 'Error inesperado en el Simulador Universal.', detail: String(e) }, 500);
  }
});
