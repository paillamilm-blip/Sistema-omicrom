// supabase/functions/run-code/index.ts
// Runner de código SEGURO — versión de un solo archivo (fácil de desplegar).
// El scoring se hace en el servidor contra los test_cases de la BD: el cliente
// NO puede falsear la nota. Persiste el intento con handle_skill_attempt.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { test_id, node_id, code } = await req.json();
    if (!test_id || typeof code !== "string") return json({ error: "Faltan 'test_id' o 'code'." }, 400);
    if (code.length > 50_000) return json({ error: "Código demasiado largo." }, 413);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Usuario que llama (desde su JWT)
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "No autenticado." }, 401);
    const userId = u.user.id;

    // Test autoritativo desde la BD
    const admin = createClient(url, service);
    const { data: test, error: te } = await admin
      .from("skill_tests")
      .select("test_cases, time_limit_seconds, passing_score")
      .eq("id", test_id)
      .single();
    if (te || !test) return json({ error: "Test no encontrado." }, 404);

    const testCases: Array<{ input: string; expected_output: string }> =
      Array.isArray(test.test_cases) ? test.test_cases : [];
    const passingScore = test.passing_score ?? 80;

    // Ejecutar el código del usuario
    const start = Date.now();
    const results: Array<{ input: string; expected: string; actual: string; passed: boolean; error?: string }> = [];
    let fatal: string | null = null;
    let solution: ((input: string) => unknown) | null = null;

    try {
      const factory = new Function(`
        "use strict";
        ${code}
        if (typeof solution !== 'function') { throw new Error('Define una función llamada "solution".'); }
        return solution;
      `);
      solution = factory() as (input: string) => unknown;
    } catch (e) {
      fatal = String((e as Error)?.message ?? e);
    }

    if (solution) {
      for (const tc of testCases) {
        const expected = String(tc.expected_output);
        try {
          const actual = String(solution(tc.input));
          results.push({ input: tc.input, expected, actual, passed: actual.trim() === expected.trim() });
        } catch (e) {
          results.push({ input: tc.input, expected, actual: "", passed: false, error: String((e as Error)?.message ?? e) });
        }
      }
    }

    let result: "PASS" | "FAIL" | "ERROR";
    let score = 0;
    if (fatal) {
      result = "ERROR";
    } else {
      const passed = results.filter((r) => r.passed).length;
      score = testCases.length ? Math.round((passed / testCases.length) * 100) : 0;
      result = score >= passingScore ? "PASS" : results.some((r) => r.error) ? "ERROR" : "FAIL";
    }
    const timeTakenSeconds = Math.round((Date.now() - start) / 1000);

    // Persistir intento + reputación
    let pe_awarded = 0;
    try {
      const { data: rpc } = await admin.rpc("handle_skill_attempt", {
        p_user_id: userId,
        p_test_id: test_id,
        p_node_id: node_id ?? null,
        p_score: score,
        p_time_sec: timeTakenSeconds,
        p_code: code,
        p_result: result,
        p_tc_results: results,
      });
      pe_awarded = (rpc as { pe_awarded?: number } | null)?.pe_awarded ?? 0;
    } catch (_e) { /* no bloquear */ }

    return json({ result, score, testCaseResults: results, timeTakenSeconds, pe_awarded, errorMessage: fatal ?? undefined });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
