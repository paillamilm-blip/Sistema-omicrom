# 🔍 Auditoría Completa — Sistema Ómicrom
_Seguridad · integridad económica · calidad · 27 de junio de 2026_

> Metodología: revisión de migraciones, RPCs, RLS y lógica económica.
> **Acción requerida:** corre `supabase/auditoria_check.sql` para confirmar el estado REAL de tu BD
> (varias cosas se corrieron a mano y no están en migraciones). Marca cada hallazgo según el resultado.

---

## ✅ LO QUE ESTÁ BIEN (fortalezas)
- 🔒 Columnas económicas/reputación **blindadas** del cliente (`protect_profile`).
- 🧮 **Reputación de fuente única** (80/20, por trigger) — el cliente no la calcula.
- 🧠 **Quiz calificado en el servidor** (las respuestas correctas no se exponen).
- 💸 RPCs económicos validan `auth.uid()` o rol (escrow, staking, bóveda, disputa, credenciales).
- 🚦 **Rate limiting** (chat 30/min, disputas 5/hora).
- 🕵️ **Caja Negra** del chat cifrada (pgcrypto + Vault, quórum de árbitros).
- 🔑 Embeddings con modelo local **gratis** (sin exponer API keys).

---

## 🔴 HALLAZGOS ALTOS (resolver antes de la beta)

### A1 · Contenido de la Bóveda NO está protegido de verdad
La política de `knowledge_vault_documents` es `select using(true)` → la **descripción (la solución que se paga)** viaja a cualquiera vía API. El "🔒 bloqueado" es **solo visual**. Alguien técnico puede leer el contenido **sin pagar**.
**Fix:** servir el contenido completo solo vía RPC `get_vault_content(doc_id)` que verifique acceso en `vault_queries`; en el listado, exponer solo título/tags/costo.

### A2 · Arbitraje sin quórum (un solo árbitro decide y mueve fondos)
`resolve_dispute` permite que **cualquiera de los 3 árbitros** resuelva solo → riesgo de abuso/colusión.
**Fix:** acumular votos y resolver con **mayoría 2-de-3**.

### A3 · Verificar RLS de disputes / arbitration_cases / human_venture_stakes
No se añadió RLS en la migración de gobernanza. Si están **abiertas**, cualquiera podría leer disputas ajenas o (peor) escribir en `arbitration_cases`/`human_venture_stakes`.
**Fix:** confirmar con el diagnóstico (bloque 1) y agregar políticas si falta.

---

## 🟡 HALLAZGOS MEDIOS

### M1 · RLS de `contracts` vive solo en la BD, no en una migración
El fix de permisos se corrió a mano → **no está versionado**. Si recreas la BD, se pierde.
**Fix:** crear migración `00xx_contracts_rls.sql` con esas políticas.

### M2 · Bóveda se auto-valida al publicar (`is_validated=true`)
No hay revisión de calidad/duplicados antes de publicar (más allá del anti-plagio por similitud).
**Fix (Fase 2):** validación en 2 fases (algorítmica + experto), como en el manifiesto.

### M3 · Manejo de errores en el frontend = `alert()`
Funciona pero no es profesional ni accesible.
**Fix:** toasts consistentes (cargando / éxito / error) — parte de la Semana 4.

### M4 · Anti-plagio depende de embeddings existentes
Docs publicados **antes** de pgvector no tienen embedding → un clon de ellos no se detecta.
**Fix:** re-embeber documentos antiguos (script una vez).

---

## 🟢 HALLAZGOS BAJOS
- B1 · Cobertura de tests limitada (solo `reputationService`). Ampliar a RPCs críticos.
- B2 · `jobs` (tabla vieja) quedó sin uso → considerar eliminarla para evitar confusión.
- B3 · Falta separación de entornos **dev/prod** en Supabase.
- B4 · Sin backups automáticos configurados / monitoreo de errores (Sentry).

---

## 🗺️ PLAN DE REMEDIACIÓN (orden sugerido)
1. **A3** → correr diagnóstico, cerrar RLS de gobernanza/economía. _(rápido)_
2. **A1** → proteger contenido de la Bóveda (RPC de acceso). _(medio)_
3. **A2** → quórum 2-de-3 en arbitraje. _(medio)_
4. **M1** → versionar RLS de contracts. _(rápido)_
5. Resto (M2-M4, B1-B4) → durante Semana 4 (Profesionalización).

---

## 🔎 CÓMO VERIFICAR (corre `auditoria_check.sql`)
- **Bloque 1:** cualquier tabla con `rls_activo=false` y datos sensibles = 🔴 revisar.
- **Bloque 2:** confirmar que cada función `security definer` valida quién llama.
- **Bloque 4:** `wallet_transactions`/`arbitration_cases`/`human_venture_stakes` NO deberían tener política de INSERT/UPDATE para el cliente (solo se tocan vía RPC).

> Pásame el resultado del diagnóstico y cierro los hallazgos 🔴 uno por uno.
