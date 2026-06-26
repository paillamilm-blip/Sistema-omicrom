// supabase/functions/run-code/worker.ts
// Worker aislado (permissions: "none") que ejecuta el código del usuario.
// No tiene acceso a red, disco ni variables de entorno.

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

self.onmessage = (e: MessageEvent) => {
  const { code, testCases } = e.data as { code: string; testCases: TestCase[] };
  const results: TestCaseResult[] = [];

  // Construir la función "solution" una sola vez.
  let solution: (input: string) => unknown;
  try {
    // "use strict" + Function constructor: el código corre en su propio scope.
    // Como el worker no tiene permisos, fetch/Deno/FS no pueden hacer daño.
    const factory = new Function(`
      "use strict";
      ${code}
      if (typeof solution !== 'function') {
        throw new Error('Define una función llamada "solution".');
      }
      return solution;
    `);
    solution = factory();
  } catch (err) {
    self.postMessage({ fatal: String((err as Error)?.message ?? err) });
    return;
  }

  for (const tc of testCases) {
    const expected = String(tc.expected_output);
    try {
      const actual = String(solution(tc.input));
      results.push({
        input: tc.input,
        expected,
        actual,
        passed: actual.trim() === expected.trim(),
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expected,
        actual: "",
        passed: false,
        error: String((err as Error)?.message ?? err),
      });
    }
  }

  self.postMessage({ results });
};
