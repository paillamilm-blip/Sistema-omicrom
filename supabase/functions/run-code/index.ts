// supabase/functions/run-code/index.ts
// Edge Function: runner de código SEGURO (server-side).
//
// Seguridad:
//  - El código del usuario se ejecuta en un Web Worker con permisos "none"
//    (sin red, sin FS, sin env) y un timeout duro que termina el worker.
//  - Los casos de prueba (y sus expected_output) se leen del servidor desde
//    `skill_tests`; el cliente nunca los envía, así no puede falsear resultados.
//  - El intento se persiste con `handle_skill_attempt` usando el user_id
//    derivado del JWT (no se puede suplantar a otro usuario).
//
// Deploy:
//   supabase functions deploy run-code
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY se inyectan solos)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TestCase {
  input: string;
  expected_output: string;
  explanation?: string;
}

interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

interface WorkerOutcome {
  status: "ok" | "timeout" | "fatal";
  results?: TestCaseResult[];
  error?: string;
  elapsedMs: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { test_id, node_id, code } = await req.json();

    if (!test_id || typeof code !== "string") {
      return json({ error: "Se requieren 'test_id' y 'code'." }, 400);
    }
    if (code.length > 50_000) {
      return json({ error: "El código excede el tamaño permitido." }, 413);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) Identificar al usuario que llama (desde su JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "No autenticado." }, 401);
    }
    const userId = userData.user.id;

    // 2) Cliente admin para leer el test y persistir (bypassa RLS)
    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: test, error: testErr } = await admin
      .from("skill_tests")
      .select("test_cases, time_limit_seconds, passing_score")
      .eq("id", test_id)
      .single();

    if (testErr || !test) {
      return json({ error: "Test no encontrado." }, 404);
    }

    const testCases: TestCase[] = Array.isArray(test.test_cases)
      ? test.test_cases
      : [];
    const timeLimitMs = Math.min(
      Math.max((test.time_limit_seconds ?? 120) * 1000, 1000),
      30_000, // tope de 30s, las Edge Functions tienen límite de ejecución
    );
    const passingScore = test.passing_score ?? 80;

    // 3) Ejecutar el código del usuario en el sandbox (worker)
    const exec = await runInWorker(code, testCases, timeLimitMs);

    let result: "PASS" | "FAIL" | "TIMEOUT" | "ERROR";
    let score = 0;
    let testCaseResults: TestCaseResult[] = [];
    let errorMessage: string | undefined;

    if (exec.status === "timeout") {
      result = "TIMEOUT";
      errorMessage = "Tiempo límite excedido.";
    } else if (exec.status === "fatal") {
      result = "ERROR";
      errorMessage = exec.error;
    } else {
      testCaseResults = exec.results ?? [];
      const passed = testCaseResults.filter((r) => r.passed).length;
      score = testCases.length
        ? Math.round((passed / testCases.length) * 100)
        : 0;
      result = score >= passingScore
        ? "PASS"
        : testCaseResults.some((r) => r.error)
        ? "ERROR"
        : "FAIL";
    }

    const timeTakenSeconds = Math.round(exec.elapsedMs / 1000);

    // 4) Persistir intento + recalcular reputación / Gemelo Digital
    let pe_awarded = 0;
    try {
      const { data: rpcData } = await admin.rpc("handle_skill_attempt", {
        p_user_id: userId,
        p_test_id: test_id,
        p_node_id: node_id ?? null,
        p_score: score,
        p_time_sec: timeTakenSeconds,
        p_code: code,
        p_result: result,
        p_tc_results: testCaseResults,
      });
      pe_awarded = (rpcData as { pe_awarded?: number } | null)?.pe_awarded ?? 0;
    } catch (_e) {
      // No bloquear la respuesta si la persistencia falla
    }

    return json({
      result,
      score,
      testCaseResults,
      timeTakenSeconds,
      pe_awarded,
      errorMessage,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Ejecuta el código en un Worker aislado con timeout duro.
function runInWorker(
  code: string,
  testCases: TestCase[],
  timeLimitMs: number,
): Promise<WorkerOutcome> {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    let worker: Worker;
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url).href, {
        type: "module",
        // @ts-ignore: opción específica de Deno / Supabase Edge Runtime
        deno: { permissions: "none" },
      });
    } catch (e) {
      resolve({
        status: "fatal",
        error: "No se pudo crear el sandbox: " + String((e as Error)?.message ?? e),
        elapsedMs: Date.now() - start,
      });
      return;
    }

    const finish = (outcome: Omit<WorkerOutcome, "elapsedMs">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        worker.terminate();
      } catch (_) { /* noop */ }
      resolve({ ...outcome, elapsedMs: Date.now() - start });
    };

    const timer = setTimeout(
      () => finish({ status: "timeout" }),
      timeLimitMs,
    );

    worker.onmessage = (e: MessageEvent) => {
      if (e.data?.fatal) finish({ status: "fatal", error: e.data.fatal });
      else finish({ status: "ok", results: e.data?.results ?? [] });
    };

    worker.onerror = (err: ErrorEvent) => {
      finish({ status: "fatal", error: err.message || "Error en el sandbox." });
    };

    worker.postMessage({ code, testCases });
  });
}
