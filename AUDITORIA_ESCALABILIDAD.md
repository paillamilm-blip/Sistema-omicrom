# 🔬 Auditoría de escalabilidad + Nueva función + Innovaciones

_Ómicrom · Julio 2026 (v9)_

Documento de trabajo con: (1) auditoría de mejoras para **escalar**, (2) la nueva
función **Ruta de Carrera** (qué estudiar si no encuentras trabajo / pivote), y
(3) **3 innovaciones sin competencia** en el mercado actual.

---

## 1) Auditoría para escalar

### 🔴 Prioridad alta (seguridad / integridad)
- **Reputación escribible desde el cliente.** Hoy `updateReputationInDatabase` (y la
  convalidación) escriben `profiles.*_score` desde el navegador. Esto es un **vector de
  auto-inflado** (un usuario podría subir su reputación). **Acción:** mover TODA escritura de
  reputación a **Edge Functions/RPC con validación** (`security definer`), y que la
  convalidación exija **verificación** (revisión de pares o credencial validada) antes de
  sumar a `foundation_score`. Dejar RLS de `profiles` sin permitir `update` de columnas de score.
- **Rate limiting** en Broadcast/acciones (evitar spam de eventos y de convalidación).

### 🟠 Prioridad media (rendimiento / costos)
- **Presencia (Realtime).** Un único canal `omicron-live` escala bien hasta ~cientos de
  conectados. Para miles: **fragmentar por cohorte/región** (varios canales) y/o un servicio de
  presencia agregada; mostrar el conteo desde un contador agregado, no desde el estado completo.
- **Ranking.** `get_leaderboard` en cada UPDATE con debounce funciona a baja escala. A escala:
  **vista materializada** del top-N refrescada por trigger/cron, e índice en
  `profiles(reputation_score desc)`. Paginar.
- **Índices** sugeridos: `job_matches(user_id)`, `job_postings(status, published_at desc)`,
  `job_applications(applicant_id)`, `reputation_history(user_id, created_at)`.
- **Realtime replication** acotada (hecho en `0047`: solo `profiles`, `job_postings`,
  `job_matches`). Revisar `REPLICA IDENTITY` si se necesitan valores previos en UPDATE.
- **Frontend:** el `RealtimeProvider` re-renderiza en cada `presence sync`; **throttle** del
  estado (p. ej. 1–2 s) para listas grandes. El núcleo (canvas) ya respeta `reduced-motion`;
  cap de satélites (36) OK.

### 🟡 Prioridad base (operación / calidad)
- **Observabilidad:** Sentry (errores front), logs de Edge Functions, métricas de conexiones
  Realtime y de invocaciones IA (Gemini) con **tope de gasto por usuario**.
- **Tests/CI:** ampliar Vitest + **E2E (Playwright)** de los flujos críticos (auth, convalidar,
  postular, realtime). El CI ya corre typecheck/lint/build/test.
- **Datos semilla + entorno demo** para poder ver lo multiusuario sin depender de tráfico real.
- **PWA offline:** cola de acciones y cache estratégico (SW) para zonas de baja conectividad.
- **Accesibilidad e i18n:** ya hay buen contraste; falta capa i18n si se abre a otros mercados.

---

## 2) Nueva función — "Ruta de Carrera" (implementada en este PR)

**Qué hace:** si no encuentras trabajo, el sistema te dice **cómo mejorar**: analiza tus 4 ejes
reales contra un catálogo de destinos de carrera, calcula tu **readiness** por rol, detecta tu
**mayor brecha** y te da una **acción concreta** (qué estudiar) que navega al hub para cerrarla
(Academia / Empleos / Bóveda). Además sugiere tu **pivote de carrera más viable** según tu
fortaleza actual (cambio de rumbo, no solo ascenso).

- Componente: `src/components/empleos/RutaCarrera.tsx` (montado en Empleos).
- Fuente: `useGemeloProfile` (reputación/ejes unificados con Supabase). Sin dependencias nuevas.

**Roadmap de la función:**
1. **Data-driven:** derivar los `target` de cada rol desde requisitos reales de `job_postings`
   (tags/nivel/categoría) en vez del catálogo curado.
2. **IA personalizada:** una Edge Function (Coach) que, con tu brecha + oferta real, recomiende
   el **curso exacto de la Academia** y estime el tiempo/PE hasta calificar.
3. **Simulación** (ver innovación #1): "si estudias X, en N semanas calificas al puesto Y".

---

## 3) Tres innovaciones sin competencia

> Todas se apoyan en el activo único de Ómicrom: un **Gemelo Digital verificable** + reputación
> por evidencia + red en tiempo real. Eso es lo que no tienen LinkedIn/Upwork/Coursera/Credly.

### 💠 Innovación 1 — Gemelo Predictivo (simulador del futuro de tu carrera)
Una "máquina del tiempo" de carrera: proyecta tu **reputación, nodo y puestos alcanzables a
6–12 meses** bajo distintos caminos (estudiar X, tomar contratos Y, mentorear Z), y calcula la
**ruta óptima inversa** para llegar al rol objetivo en el menor tiempo/PE. Determinista (fórmula
de reputación) + IA para el plan.
**Por qué no existe:** los perfiles profesionales muestran tu *presente*; nadie **simula tu
futuro** atado a acciones verificables. Es un "planificador financiero", pero de tu carrera.

### 💠 Innovación 2 — Co-inversión en talento con aval reputacional (Escrow de futuro / ISA)
Mentores o empresas pueden **stakear tokens Ω en tu crecimiento**: financian tus cursos/contratos
y comparten el upside cuando **subes de nodo o cierras contratos** (income-share respaldado por el
Gemelo verificable como colateral). Escrow que libera según hitos de reputación **verificables**.
**Por qué no existe:** los ISA tradicionales no tienen un colateral de reputación auditable en
tiempo real; aquí el Gemelo **es** el activo verificable, y el riesgo se mide con datos on-platform.

### 💠 Innovación 3 — Contratación a ciegas por competencia verificable (Blind Skill Hiring)
La empresa publica una necesidad y el sistema **arma candidatos anónimos** (gemelos verificados),
lanza un **micro-reto evaluado por IA en vivo** y presenta a los mejores por **competencia
demostrada**, no por CV ni nombre. Anti-sesgo, anti-fraude: se contrata lo que **se puede probar**.
Cierra con escrow + entrevista IA → oferta, **sin que el candidato postule** ("el trabajo te
contrata solo").
**Por qué no existe:** los marketplaces contratan por reputación declarada/histórico; aquí la
decisión se basa en **evidencia verificable + prueba en vivo**, con identidad oculta hasta la oferta.

---

_Siguiente paso sugerido: endurecer la escritura de reputación en el servidor (🔴) antes de la
beta pública, y prototipar la Innovación 1 (Gemelo Predictivo) reutilizando `bestNextStep` +
el catálogo de `RutaCarrera`._
