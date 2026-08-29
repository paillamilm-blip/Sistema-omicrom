# Plan: Credencial Ómicron - perfil compartible y verificable + match para agrandar la red

> **Objetivo:** rediseñar cómo se presenta el perfil / "Gemelo Digital" como una **credencial compartible y verificable**, abierta desde el ícono de avatar de arriba a la derecha, **sin debilitar el protagonismo del orbe asistente principal**, y con un **sistema de match para AGRANDAR la red de contactos** (conectar y crecer la red, NO match de empleos).
>
> **Regla de oro:** este es un plan **no destructivo**. Cada incremento es un PR que mantiene CI verde (`tsc --noEmit` + `eslint` + `vitest --run` + `vite build`) y no rompe ningún flujo existente. Se reusa lo que ya existe; no se reconstruye.
>
> **Idioma:** producto en español, código en inglés, comentarios en español. **CERO JERGA**: cada número con su escala (ej. `65/100`), y cada dato explica QUÉ / POR QUÉ / QUÉ GANA.

---

## 1. Estado actual (mapa con referencias file:line)

### 1.1 La identidad de marca: el ORBE
- `src/shared/components/GeodesicOrb.tsx` - esfera geodésica wireframe en SVG puro (sin Three.js). Props confirmadas: `nodes` (0-42), `color`, `size` (default 200), `breathing` (default true), `spinning` (segundos, `0` = sin giro), `intensity` (0-1), `style`, `className`.
- Consumidores actuales del orbe (todos usan el MISMO componente, distinto "registro visual"):
  - `src/App.tsx:113` - loader `size={168} nodes={12} spinning={25}`
  - `src/features/auth/components/AuthOverlay.tsx:288`, `NoAccess.tsx:53`, `ResetPasswordOverlay.tsx:98` - `size={80} nodes={10}`
  - `src/features/omicron/components/GemeloReveal.tsx:205`, `ConvalidaOmicron.tsx:95,144`, `OrbOnboarding.tsx:320`
  - `src/features/omicron/components/OrbShell.tsx:199` (`size={64}`) y `:1270` (`size={80}`)
- **Conclusión:** el orbe-retrato de la credencial DEBE ser este mismo `GeodesicOrb`, presentado en "registro retrato": `size` menor (~120-140), `spinning` lento o `0`, `breathing` suave, `intensity` baja (~0.55-0.65). Así no compite con el orbe asistente principal (`OrbNeuronal`, grande y vivo, `OrbShell.tsx:~745`).

### 1.2 El ícono de arriba a la derecha (el disparador)
- `src/features/omicron/components/OrbShell.tsx:757-807` - botón avatar (esquina superior derecha, `zIndex: 4`, `width/height: 44`).
- Su `onClick` actual (líneas ~759-765): busca el nodo `'inicio'`, hace `setSelectedNode(node)` + `setState('fullscreen')` + `setActiveTab('perfil')`. Es decir, hoy **solo abre el `GemeloTab`**.
- Muestra `sbProfile.avatar_url` o las iniciales derivadas de `display_name || full_name || username`.
- **Cambio objetivo:** el `onClick` debe abrir el **nuevo modal de Credencial** en vez de saltar al tab. Es un cambio de una sola función; se puede introducir detrás de un estado local `[credentialOpen, setCredentialOpen]`.

### 1.3 La vista de perfil actual (se MANTIENE tal cual)
- `src/features/gemelo/components/GemeloTab.tsx` (471 líneas) - 3 tarjetas deslizables: Identidad / Competencias / Impacto (`CARD_LABELS`, línea ~35). Ya migrada a `useUserColor()` (línea ~50: `const uc = useUserColor()`) y a escala `/100`.
- Deriva `skillsDetail` con fallback (líneas 59-63), `top3` (66-68), `name`/`years`/`seniorLabel` (~70-75).
- Montado en `OrbShell.tsx:208` (`case 'perfil': return <GemeloTab />`).
- **Constraint:** NO tocar. La credencial es una vista **distinta y complementaria** (el "carnet"), el `GemeloTab` es el "taller" interno.

### 1.4 Todo lo pedido YA EXISTE, pero enterrado en `RedSocial.tsx`
`src/features/gemelo/components/RedSocial.tsx` (816 líneas) contiene y EXPORTA:

| Símbolo | Líneas aprox. | Qué hace | Reusar para |
| --- | --- | --- | --- |
| `ShareCredentialModal` | 78-230 | QR (`api.qrserver.com`, línea ~90) + copiar link (`navigator.clipboard`) + `navigator.share` (~123) + Pasaporte Verificable vía `supabase.functions.invoke('credential', { action:'issue' })` → `?verificar=<token>` (~99-108) | **Compartir** de la credencial |
| `PublicCredentialModal` | 236-430 | Lee `get_public_credential`; muestra reputación `/100` + `ProgressRadar` (4 ejes); botón conectar (`send_connection_request` / `respond_connection_request` / `connection_status`); calcula "AFINIDAD DE COLABORACION" **solo con 4 ejes** (~380-405) | **Vista pública** + base de la "fusión de orbes" |
| `PublicProfileGate` | 436-462 | Lee `?perfil=username` de la URL y abre `PublicCredentialModal`. Montado en `App.tsx:18` | Deep link público (**no romper**) |
| `DirectChatModal` | 500-620 | DM en tiempo real (`get_direct_thread`, `send_direct_message`, canal realtime) | Chat de conexiones |
| `RedPanel` | 660-816 | Ranking (`get_leaderboard`), solicitudes (`my_pending_requests`), conectados (`my_connections`) | Panel "Mi red" |

- `profileLink(username)` (línea ~28) construye `?perfil=<username>`. `qrSrc` usa `https://api.qrserver.com/v1/create-qr-code/?...&data=<link>` (API externa; funciona hoy).
- **Problema real = ARQUITECTURA DE INFORMACIÓN**, no de features: esto vive en el tab "Mensajes/Red Social" (`RedSocialTab.tsx`, montado en `OrbShell.tsx:213` como `case 'chat'`), donde nadie lo asocia con "mi perfil". **El plan aflora/reusa esto; NO lo reconstruye.**

### 1.5 RPCs de Supabase existentes (confirmados en `supabase/migrations/0070_missing_rpcs_connections_dms.sql`)
- `get_public_credential(p_username text)` (línea 219). **RETURNS TABLE** devuelve: `id, username, full_name, avatar_url, bio, location, node_type, node_level, is_verified_professional, reputation_score, execution_score, quality_score, transcendence_score, foundation_score, pe_points, total_contracts_completed`.
  - ⚠️ **NO devuelve `skills_detail`.** Este es el hecho decisivo para la "fusión de orbes" (ver §5).
  - `GRANT ... TO authenticated, anon` → el deep link público funciona sin login.
  - Filtra `is_ghost = false` y es `STABLE` → **lee datos en vivo** (credencial viva, no PDF muerto). ✔️
- `get_leaderboard`, `send_connection_request`, `respond_connection_request`, `connection_status`, `my_pending_requests`, `my_connections`, `get_direct_thread`, `send_direct_message`, `mark_dm_read`, `my_dm_conversations` - todos ya existen.
- Edge function `credential` (`action: 'issue'`) → token para `?verificar=`.
- **Regla de reputación:** reputación/ejes se calculan **server-side**; el cliente solo lee (confirmado: `RedSocial` solo hace `SELECT` vía RPC). El plan respeta esto.

### 1.6 Datos de skills (para el match)
- `profile.skills_detail?: { name: string; pct: number }[]` (`src/types/profile.ts:22`). `pct` = % de dominio 0-100.
- Fallback existente cuando no hay detail (usado en `GemeloTab.tsx:59-63`, `MaxSkillTab.tsx:124-132`, `AuthOverlay.tsx:106`): derivar de `skills[]` con % estimado.
- **Este es el insumo de la "fusión de orbes" y del "match con propósito".** Ya está tipado y poblado en el perfil propio; falta exponerlo en la credencial pública (§5).

### 1.7 Componentes de perfil MUERTOS (0 imports, verificado por grep)
Verificación: `grep -rn "<Componente>" src` excluyendo su propia definición → 0 usos en los 5 casos.

| Componente | Líneas | Contenido único | Recomendación | Justificación |
| --- | --- | --- | --- | --- |
| `PasaporteGemelo.tsx` | 125 | `drawPassport()` → canvas 600×860 → PNG descargable (`toDataURL`), con reputación, PE, 4 ejes | **RESCATAR** | Es exactamente la acción "Descargar" de la credencial (§ Incremento 4). Adaptar el canvas para incluir el orbe-retrato. NO borrar. |
| `PerfilSkillVisual.tsx` | 495 | Visualización de skills (`skillsDetail`, orden por `pct`) | **BORRAR** (candidato) | Superado por `GemeloTab` Card "Competencias" y `MaxSkillTab`. Confirmar 0 imports antes de borrar (ya verificado). No aporta lógica que la credencial necesite. |
| `ProfileCard.tsx` | 371 | Tarjeta de perfil | **BORRAR** (candidato) | Superado por `PublicCredentialModal` (vista pública) y `GemeloTab` (vista interna). Sin lógica única rescatable. |
| `DossierEvidencia.tsx` | 111 | Dossier de evidencia | **BORRAR** (candidato) | Sin consumidores; no forma parte del alcance de credencial/match. |
| `CartaCompetencias.tsx` | 110 | Carta de competencias | **BORRAR** (candidato) | Duplica la card de competencias del `GemeloTab`. Sin lógica única. |

> **Política de borrado:** el borrado va en su **propio PR final** (Incremento 6), separado de las features, para que un revert sea trivial y CI aísle el impacto. Antes de borrar cada archivo, el coder debe re-confirmar 0 imports (`grep`) y que `tsc`/`vite build` siguen verdes.

---

## 2. Arquitectura objetivo

### 2.1 Árbol de componentes (nuevo)
```
OrbShell.tsx
├─ OrbNeuronal ............................ orbe asistente PRINCIPAL (protagonista, sin cambios)
├─ [avatar button top-right] ............. onClick → setCredentialOpen(true)   (cambio en Incremento 2)
└─ {credentialOpen && <CredencialModal />}  (nuevo, Incremento 2)

CredencialModal.tsx  (NUEVO - src/features/gemelo/components/CredencialModal.tsx)
├─ <Overlay>                              (reusa patrón visual de RedSocial: fixed, blur, maxWidth 420)
├─ Orbe-RETRATO ......................... <GeodesicOrb size~130 spinning=0|slow breathing intensity~0.6 color={useUserColor()}>
│                                          nodes = f(skills_detail.length)  (mismo criterio que el orbe vivo)
├─ Nombre · seniorLabel · años           (reusa derivación de GemeloTab: display_name||full_name||username)
├─ "Firma Ómicron" ...................... handle único derivado (ver §4)   (Incremento 3)
├─ Reputación /100 + 4 ejes /100 ........ reusa <ProgressRadar> (ya usado en RedSocial)
├─ Acciones:
│   ├─ Compartir ........................ reusa ShareCredentialModal (QR + link + native share)   (Incremento 1)
│   └─ Descargar ........................ adaptación de PasaporteGemelo (canvas→PNG)               (Incremento 4)
└─ (nada de connect aquí: es MI credencial; el connect vive en la vista pública del otro)

PublicCredentialModal.tsx  (RedSocial.tsx - se EXTIENDE, no se reescribe)
└─ + "Fusión de orbes": nodos compartidos vs complementarios + "Match con propósito"   (Incremento 5)
```

### 2.2 Dónde vive cada cosa
- **Nuevo:** `src/features/gemelo/components/CredencialModal.tsx` (mi propia credencial, abierta desde el avatar).
- **Reuso directo (import, sin copiar):** `ShareCredentialModal`, `PublicCredentialModal`, `ProgressRadar`, `GeodesicOrb`, `useUserColor`, tokens `C/FONT/RADIUS`.
- **Rescate/adaptación:** lógica `drawPassport` de `PasaporteGemelo.tsx` → botón "Descargar" dentro de `CredencialModal`.
- **Extensión in-place:** `PublicCredentialModal` gana la sección de fusión de orbes (§5).
- **Sin cambios:** `GemeloTab`, `OrbNeuronal`, `RedPanel`, `DirectChatModal`, `PublicProfileGate`, deep links `?perfil=` / `?verificar=`, todos los RPCs de connect/match/leaderboard.

### 2.3 Cómo el avatar abre la credencial (sin romper nada)
- Se agrega estado local `const [credentialOpen, setCredentialOpen] = useState(false)` en `OrbShell`.
- El `onClick` del avatar pasa a `() => setCredentialOpen(true)` (se elimina el salto a `perfil`/`fullscreen`).
- Se renderiza `{credentialOpen && <CredencialModal onClose={() => setCredentialOpen(false)} />}`.
- El `GemeloTab` sigue accesible por el nodo del orbe (hub `perfil`), así que no se pierde ninguna ruta.

---

## 3. Constraints duros (checklist para cada PR)
- [ ] El orbe asistente principal (`OrbNeuronal`) sigue siendo el protagonista visual; el orbe de credencial es deliberadamente secundario (retrato: más chico, calmo, spin lento/nulo).
- [ ] NO romper `?perfil=` (`PublicProfileGate`) ni `?verificar=` (`VerifyCredentialView` / edge function `credential`).
- [ ] NO romper `GemeloTab` (vista panel interna intacta).
- [ ] NO romper connect / match / leaderboard / DM de `RedSocial`.
- [ ] Reusar RPCs existentes. Solo UNA migración nueva propuesta (§5), **idempotente, con los mismos GRANT, vía PR, nunca directo a main**.
- [ ] Reputación/ejes solo se leen en el cliente (server-side authority intacta).
- [ ] `useUserColor()` para acentos personales; tokens `C` para marca (Silver Ice `C.cyan`).
- [ ] CERO JERGA: todo número con `/100`, cada bloque explica QUÉ/POR QUÉ/QUÉ GANA.
- [ ] CI verde: `npm run typecheck && npm run lint && npm run test && npm run build`.

---

## 4. "Firma Ómicron" (detalle de identidad barato y único)
- **Qué:** un string corto y determinista derivado de los propios datos del orbe/perfil, presentado como handle verificable único. Ejemplo de composición: `Ω-<nNodos>-<repRedondeada>-<ejesActivos>` → p.ej. `Ω-24-71-EQTF` (24 nodos-skill, reputación 71/100, ejes activos Ejecución/Calidad/Trascendencia/Fundamento).
- **Por qué:** da sensación de credencial oficial y hace la tarjeta memorable/compartible; es "algo que nadie tiene".
- **Cómo (client-side, sin migración):** función pura en `CredencialModal` (o helper en `src/features/gemelo/services/`) que toma `skills_detail.length`, `reputation_score`, y qué ejes superan un umbral. Determinista → misma entrada, misma firma. **Es solo presentación**: no se persiste ni se usa como identificador de seguridad (la verificación real sigue siendo el `?verificar=` firmado server-side).
- **Testeable:** función pura → test unitario en Vitest (misma entrada ⇒ misma salida; cambia si crecen los nodos).

---

## 5. Diseño técnico: "Fusión de orbes" + "Match con propósito"

**Idea:** cuando alguien abre tu QR/link (`PublicCredentialModal`), ve **los dos orbes** y:
- **Nodos compartidos** (skills en común) → iluminados = señal de **confianza** ("hablan el mismo idioma").
- **Nodos complementarios** (skill fuerte en uno, débil/ausente en el otro) → señal de **razón para colaborar/crecer la red**.
- **Match con propósito**: texto CERO JERGA que dice POR QUÉ conectar, ej.:
  - "Podés aprender **SAP** de esta persona (ella 85/100, vos 40/100)."
  - "Vos podés enseñarle **Gestión** (vos 78/100, ella 30/100)."

> Recordatorio del usuario: **el match es para conectar y agrandar la red de contactos, NO match de empleos.** El copy debe hablar de "conectar", "aprender", "enseñar", "colaborar", "crecer tu red", nunca de "vacante"/"puesto"/"postular".

### 5.1 El bloqueante de datos
`get_public_credential` **no devuelve `skills_detail`**. Sin las skills del otro no se pueden computar nodos compartidos/complementarios. Dos caminos:

- **Camino A (recomendado) - extender el RPC con UNA migración idempotente.**
  - Nueva migración `supabase/migrations/00NN_public_credential_skills.sql`:
    - `CREATE OR REPLACE FUNCTION public.get_public_credential(...)` agregando `skills_detail jsonb` al `RETURNS TABLE` y al `SELECT` (la columna ya existe en `profiles`, ver `APLICAR_EN_SUPABASE.sql:21`).
    - Mantener EXACTOS los mismos `GRANT ... TO authenticated, anon`.
    - `CREATE OR REPLACE` = idempotente; no borra ni altera datos; RLS intacto (sigue `STABLE`, sigue filtrando `is_ghost`).
  - Cliente: `PublicCredentialModal` añade `skills_detail` a la interfaz `PublicCred` y al mapeo (`RedSocial.tsx:~256-275`).
  - **Riesgo:** medio (toca SQL). Mitigación: migración en su propio PR, revisada, aplicada vía PR nunca directo a main. Como es `CREATE OR REPLACE`, un revert es re-aplicar la versión previa del mismo archivo `0070`.

- **Camino B (fallback sin migración) - degradar con gracia.**
  - Si `skills_detail` no está disponible, la sección de fusión muestra solo la **afinidad de 4 ejes** que YA existe (`RedSocial.tsx:~380-405`) y un mensaje "Skills detalladas no disponibles para este perfil".
  - Permite entregar la UI de fusión **antes** que la migración, y sirve de salvaguarda si un perfil viejo no tiene `skills_detail`.

> **Decisión de plan:** implementar **B primero** (Incremento 5a, sin SQL, no destructivo) y **A después** (Incremento 5b, migración) para que la fusión "real" se encienda cuando el dato esté disponible. Así el riesgo SQL queda aislado y la UI ya está probada.

### 5.2 Cómo computar compartidos vs complementarios (función pura, testeable)
Insumo: `mine: {name, pct}[]` (del `profile` propio) y `theirs: {name, pct}[]` (de la credencial pública).

```
normalizar nombre = trim + lowercase   (para casar "React" con "react")
SHARED   = skills presentes en AMBOS (por nombre normalizado)
COMPLEMENT = skills donde |mine.pct - theirs.pct| >= UMBRAL (p.ej. 25)
             → "puedo aprender" si theirs.pct > mine.pct
             → "puedo enseñar"  si mine.pct  > theirs.pct
ONLY_THEIRS = skills que solo tiene el otro (ausentes en mine) → "podés aprender algo nuevo"
```
- Devuelve estructuras para: (a) iluminar nodos en los dos `GeodesicOrb`, (b) generar las frases "aprender/enseñar" con los `pct` reales y su `/100`.
- **Nodos iluminados:** como `GeodesicOrb` dibuja `nodes` genéricos (no mapea skills→vértices), la iluminación se hará a nivel de composición: dos orbes lado a lado con `nodes = skills.length` (clamp 0-42) y una lista/leyenda debajo que marca compartidos (color usuario) vs complementarios (color marca). No se altera la API interna de `GeodesicOrb` (no destructivo). Si más adelante se quiere resaltado por vértice, sería un incremento aparte.
- **Tests (Vitest, funciones puras):** casos: skills idénticas ⇒ todo shared, cero complement; skill solo del otro ⇒ ONLY_THEIRS "aprender"; skill fuerte mío ⇒ "enseñar"; nombres con mayúsculas/espacios ⇒ casan; listas vacías ⇒ no crashea, devuelve vacío.

---

## 6. Incrementos (ordenados de más seguro a más riesgoso)

> Cada incremento = 1 PR, CI verde, sin romper flujos. "Verificar" = comandos reales del proyecto + revisión manual del flujo.

### Incremento 0 - Baseline verde (setup)
- **Archivos:** ninguno de feature.
- **Qué:** `npm install`; correr `npm run typecheck && npm run lint && npm run test && npm run build` para confirmar baseline verde antes de tocar nada. (Nota: red INTEGRATIONS_ONLY puede impedir `npm install` local; en ese caso CI de GitHub es la fuente de verdad.)
- **Riesgo:** nulo.
- **Verificar:** los 4 comandos pasan (o el pipeline de CI del PR base).

### Incremento 1 - `CredencialModal` mínima (solo lectura + compartir), NO enganchada al avatar
- **Archivos:** nuevo `src/features/gemelo/components/CredencialModal.tsx`. (aún no se toca `OrbShell`).
- **Qué:** modal con Overlay (patrón visual de `RedSocial`), orbe-retrato (`GeodesicOrb size~130 spinning=0 breathing intensity~0.6 color={useUserColor()}`, `nodes` desde `skills_detail.length`), nombre/seniorLabel/años (misma derivación que `GemeloTab`), reputación `/100` + `ProgressRadar` de 4 ejes, y botón "Compartir" que abre el `ShareCredentialModal` existente (import, no copia). Textos CERO JERGA.
- **Riesgo:** bajo (componente aislado, sin consumidores todavía → no puede romper nada en runtime; solo debe compilar y lint-ear).
- **Verificar:** `typecheck+lint+test+build` verdes; render manual montando el componente en dev; confirmar que el orbe se ve "retrato" (calmo) y no compite.

### Incremento 2 - Enganchar el avatar → abrir `CredencialModal`
- **Archivos:** `src/features/omicron/components/OrbShell.tsx` (botón avatar líneas ~757-807).
- **Qué:** agregar `useState` `credentialOpen`; cambiar el `onClick` a `setCredentialOpen(true)`; renderizar `{credentialOpen && <CredencialModal .../>}`. `GemeloTab` sigue accesible por el hub del orbe.
- **Riesgo:** bajo-medio (toca el shell principal). Mitigación: cambio localizado; el orbe principal y los tabs no se tocan.
- **Verificar:** build verde; manual: tocar avatar abre la credencial; el orbe asistente sigue protagonista; navegar a `perfil` por el nodo sigue mostrando `GemeloTab`.

### Incremento 3 - "Firma Ómicron"
- **Archivos:** helper puro en `src/features/gemelo/services/` (nuevo) + su test; consumirlo en `CredencialModal.tsx`.
- **Qué:** función determinista que compone la firma (§4) y su render en la credencial.
- **Riesgo:** bajo (función pura + una línea de UI).
- **Verificar:** test unitario Vitest (determinismo + cambia con más nodos); build verde; manual: la firma aparece y es estable.

### Incremento 4 - "Descargar" (rescate de `PasaporteGemelo`)
- **Archivos:** adaptar `drawPassport`/canvas de `PasaporteGemelo.tsx` hacia una acción "Descargar PNG" dentro de `CredencialModal` (o extraer `drawPassport` a un helper reutilizable y llamarlo desde la credencial).
- **Qué:** botón "Descargar" que genera el PNG (reputación, PE, 4 ejes; opcional: incluir el orbe-retrato en el canvas). Reusar `toDataURL('image/png')`.
- **Riesgo:** bajo-medio (canvas). Mitigación: reusar código ya probado de `PasaporteGemelo`.
- **Verificar:** build verde; manual: descarga produce un PNG legible con datos correctos y escala `/100`.

### Incremento 5a - "Fusión de orbes" (fallback sin SQL) en `PublicCredentialModal`
- **Archivos:** nuevo helper puro `orbFusion` en `src/features/gemelo/services/` + test; extender `PublicCredentialModal` (`RedSocial.tsx`).
- **Qué:** sección "Fusión de orbes": dos orbes lado a lado + leyenda de compartidos/complementarios + frases "aprender/enseñar". Si no hay `skills_detail` del otro (aún no expuesto), degradar a la afinidad de 4 ejes existente + mensaje. Copy: "conectar/crecer tu red", nunca empleos.
- **Riesgo:** medio (toca el archivo que sostiene connect/deep-link). Mitigación: solo AÑADIR una sección; no tocar la lógica de `connect`/`loadStatus`/gate. Función de cómputo es pura y testeada.
- **Verificar:** build verde; tests de `orbFusion`; manual con `?perfil=<otro>`: la sección aparece, el connect sigue funcionando, el gate sigue cerrando la URL.

### Incremento 5b - Migración: exponer `skills_detail` en `get_public_credential`
- **Archivos:** nueva `supabase/migrations/00NN_public_credential_skills.sql` (idempotente, `CREATE OR REPLACE`, mismos GRANT); actualizar interfaz `PublicCred` y mapeo en `RedSocial.tsx`; encender la fusión "real" en `orbFusion`.
- **Qué:** ver §5.1 Camino A.
- **Riesgo:** más alto (SQL en prod). Mitigación: PR dedicado, revisión de RLS/GRANT, aplicar vía PR nunca directo a main; `CREATE OR REPLACE` reversible; el cliente ya degrada con gracia (5a) si el campo faltara.
- **Verificar:** build+lint+test del cliente verdes; en un entorno Supabase de prueba: `get_public_credential('<user>')` devuelve `skills_detail`; la fusión real ilumina compartidos/complementarios; `anon` sigue teniendo acceso (deep link público intacto).

### Incremento 6 - Limpieza de componentes muertos (PR separado, último)
- **Archivos:** borrar `PerfilSkillVisual.tsx`, `ProfileCard.tsx`, `DossierEvidencia.tsx`, `CartaCompetencias.tsx`. **Conservar `PasaporteGemelo.tsx`** (o dejar solo si su `drawPassport` ya fue extraído a helper en Inc. 4; en ese caso también puede borrarse el componente wrapper).
- **Qué:** eliminar código muerto tras confirmar 0 imports.
- **Riesgo:** bajo (si el grep confirma 0 imports) pero se aísla en su propio PR para revert trivial.
- **Verificar:** re-grep 0 imports por archivo antes de borrar; `typecheck+build` verdes tras el borrado.

---

## 7. Resumen de migraciones Supabase
- **Preferencia:** ninguna. Todo el núcleo (compartir, deep link, connect, verificar, credencial pública) reusa RPCs/edge-functions existentes.
- **Única migración propuesta (opcional, Incremento 5b):** extender `get_public_credential` para devolver `skills_detail`. Idempotente (`CREATE OR REPLACE`), mismos GRANT `authenticated`+`anon`, sin cambios de RLS, sin DDL destructivo. Solo necesaria para la versión "real" de la fusión de orbes; la UI ya funciona sin ella (fallback 5a).

## 8. Qué hace esto "algo que nadie tiene" (alto valor)
- **Credencial viva, no PDF muerto:** `get_public_credential` es `STABLE` y lee en vivo → el orbe crece cuando crecen las skills, y el que abrió tu link ve tu estado actual.
- **Fusión de orbes:** dos señales simultáneas - confianza (compartido) + razón para colaborar (complementario) - que ningún CV/LinkedIn muestra visualmente.
- **Match con propósito y CERO JERGA:** "podés aprender X / podés enseñar Y" con números `/100`, entendible por cualquier profesional.
- **Firma Ómicron:** handle-retrato único derivado del propio orbe.
- **Mismo orbe, dos registros:** el asistente vivo (protagonista) y el retrato de la credencial (secundario) refuerzan una sola identidad de marca.
