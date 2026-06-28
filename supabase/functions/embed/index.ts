// supabase/functions/embed/index.ts
// Genera embeddings (384 dims) con el modelo gte-small integrado de Supabase.
// Sin API externa, sin costo de tokens. Se usa para:
//  - publicar documentos en la Bóveda (guardar su embedding)
//  - búsqueda semántica (embedding de la consulta)
//
// Desplegar desde el Dashboard de Supabase > Edge Functions > New function "embed".

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Modelo local de Supabase (gte-small -> vector de 384 dimensiones)
const session = new Supabase.ai.Session('gte-small');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Falta el campo "text"' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // mean_pool + normalize -> embedding listo para similitud por coseno
    const embedding = await session.run(text, { mean_pool: true, normalize: true });

    return new Response(JSON.stringify({ embedding }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
