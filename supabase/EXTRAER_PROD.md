# Extraer objetos de producción no versionados

Varias funciones (RPC) y tablas viven **solo en tu base de datos real** (creadas a mano,
"configuración previa"), no en las migraciones. Este kit las captura para versionarlas
sin adivinar y sin riesgo de romper producción.

## Objetos que faltan versionar

**Funciones (RPC) usadas por el frontend pero ausentes del repo:**
`connection_status`, `get_direct_thread`, `get_leaderboard`, `get_public_credential`,
`mark_dm_read`, `my_connections`, `my_dm_conversations`, `my_pending_requests`,
`resolve_audit`, `respond_connection_request`, `send_direct_message`
(+ las tablas que estas funciones usan por dentro: conexiones, mensajes directos, etc.)

**Tablas ausentes:** `rank_audits` (y posiblemente `avatars`, que puede ser un bucket de Storage).

---

## Opción 1 (RECOMENDADA): `pg_dump` — completa y autoritativa

Un solo comando te da TODO el DDL real (tablas, funciones, políticas RLS, índices, triggers).
Necesitas la cadena de conexión de tu proyecto (Supabase → Project Settings → Database →
Connection string → URI). Luego, en tu máquina:

```bash
pg_dump "postgresql://postgres:[TU_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --schema-only --schema=public --no-owner --no-privileges \
  > prod_schema.sql
```

Adjúntame `prod_schema.sql` en el chat. Yo extraigo solo lo que falta y lo dejo como
migración limpia y ordenada. (El archivo es texto; no importa que sea grande.)

> Si no tienes `pg_dump` instalado: `brew install libpq` (Mac) o `apt install postgresql-client` (Linux),
> o úsalo desde cualquier equipo con Postgres client.

---

## Opción 2 (FALLBACK): SQL Editor de Supabase

Si no puedes correr `pg_dump`, abre el **SQL Editor** de Supabase y corre las consultas de
`EXTRAER_PROD.sql` **una por una**. Cada una devuelve texto; para las funciones conviene
usar el botón **Export → CSV** (así no se trunca) y adjuntarme el resultado.

Orden sugerido:
1. Consulta **A** → lista de tablas reales (para detectar cuáles faltan).
2. Consulta **B** → definiciones completas de las funciones faltantes.
3. Consulta **C** → políticas RLS.
4. Consulta **D** → DDL reconstruido de tablas.
5. Consulta **E** → índices y llaves foráneas.

Pégame (o adjunta) los resultados y armo la migración.
