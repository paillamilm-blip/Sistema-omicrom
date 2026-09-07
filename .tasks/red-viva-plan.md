# RED VIVA — el CV convertido en tablero de recompensas

> Plan de rediseño del home. Escrito el 7-sep-2026, después de auditar `OrbShell`,
> `OrbNeuronal`, `CredencialModal`, `matcher.ts` y `10000_fondo_conocimiento.sql`.
>
> Esto **no es un rediseño visual**. Es cablear una promesa que hoy está desconectada.

---

## 1. La tesis

> **Cada cosa que tu CV afirma sin probar es un nodo hueco. Cada nodo hueco tiene una
> recompensa en plata real esperando a que la pruebes. La pantalla de inicio es el mapa
> de esa plata.**

El home no es un dashboard (vanidad), ni un espejo (no genera acción), ni un menú
(lo que es hoy, disfrazado de red). Es **el tablero de lo que podés cobrar por demostrar
lo que ya dijiste que sabés**.

Por qué esto es defendible y no un eslogan: la reputación de Ómicrom ya es, por
definición, **20 % afirmaciones + 80 % pruebas**. Afirmar y probar ya son dos estados
distintos en el modelo de datos. La Red Viva solo los hace visibles.

---

## 2. El lenguaje visual: 3 estados, cero jerga

| Estado | Se ve | Le dice al usuario | Dato que lo respalda |
|---|---|---|---|
| **Hueco** (contorno fino, tenue) | anillo sin relleno | *"Vos lo dijiste. Nadie lo comprobó."* | `profiles.skills_detail[].name` (viene del CV) |
| **Latiendo** (pulso lento) | relleno parcial que respira | *"Lo estás probando ahora."* | examen en curso / contrato activo |
| **Sólido** (relleno + glow) | lleno con el color del usuario | *"Probado. Y esto te pagó $N."* | fila `out` del libro del Fondo con `note='skill:<x>'` |

**Consecuencia buscada:** una red mayormente hueca grita *"solo lo declaré"*. Una red
sólida grita *"lo demostré"*. El modelo 20/80 deja de necesitar explicación escrita.

### Regla de integridad (heredada de la Credencial, no negociable)
Nunca se pinta un nodo como **sólido** por heurística de `pct`. Sólido = existe una
prueba registrada. Si no hay prueba, es hueco, aunque el CV diga 95 %. Un `pct` alto
sin prueba se dibuja como **hueco grande**: *"afirmás mucho y no probaste nada"*, que
es exactamente la verdad que el producto vende.

---

## 3. Los 3 cortes de la cadena (hallazgos de la auditoría)

La visión dice: *aprendizaje continuo en tiempo real conectado con oportunidades reales*.
Hoy la cadena está cortada en 3 lugares, y ninguno se ve desde la UI:

1. **No podés dar examen de una habilidad de tu CV.**
   `MaxSkillTab.tsx:85` fabrica `makeVirtualNode` con `id: 'virtual-<slug>'`, pero
   `supabase/functions/simulador-universal/index.ts:110` busca ese id en
   `skill_tree_nodes` (columna **uuid**) → **404 'Nodo no encontrado'**.
   Solo se puede examinar el catálogo precargado.

2. **Probar mejor no paga mejor.**
   `MaxSkillTab.tsx:486` llama `register_exam_success` con **`p_score: 80` hardcodeado**.
   La escala 300→500 del Fondo nunca se recorre: todos cobran 366. El score real
   (`ResultadoData.puntaje_global`) existe y se descarta.

3. **El sistema no sabe qué te falta para un empleo.**
   `matcher.ts:229` (`getGapSkills`) filtra un **pool fijo de 9 strings**
   (`typescript, testing, architecture, 3d, node, python, design, product, devops`).
   A un ingeniero industrial le dice que le falta *"3d"* y *"devops"*.
   Y `JOBS` (`matcher.ts:37`) son **11 empleos hardcodeados**.

Bonus: **`omicron_fund_balance()` está expuesta a `authenticated` desde el PR #391 y
ningún archivo del front la llama.** El Fondo es real, auditable… e invisible.

---

## 4. Qué NO existe todavía (y hay que construir)

> Estado al cerrar el Inc 5: los puntos 1, 2, 3 y 4 de esta tabla ya están resueltos.
> Queda pendiente el estado LATIENDO (`exam_sessions` no tiene policy de lectura para su
> dueño, así que el cliente no puede saber que hay un examen en curso).

| Falta | Por qué duele | Cómo se resuelve |
|---|---|---|
| Estado de prueba **por nombre de skill** | `user_skill_progress` y `actas_evidencia` van por `node_id uuid`. El libro del Fondo sí tiene `note='skill:<x>'` pero su RLS está **activa sin políticas** → ilegible desde el cliente. **Hoy SÓLIDO es inobservable** | RPC nuevo `omicron_skill_proofs()` (security definer, filtra por `auth.uid()`) |
| Cotización previa de la recompensa | Solo existe el saldo global. No hay "cuánto paga esta skill", ni "ya la cobré", ni "cuánto me queda del tope diario" | RPC nuevo `omicron_fund_quote(p_skill)` |
| Brechas con nombre por empleo | Ni `matcher.ts` ni `opportunityBridge.ts` lo devuelven; el servidor manda `matched_skills` (lo que **sí** tenés) pero nunca el complemento | `gapEngine.ts`: `required_skills − skills` sobre empleos reales |
| Examen de skill arbitraria | Es el corte #1 y es el más caro | Incremento 5 (backend). Hasta entonces la ficha del nodo es honesta sobre qué se puede probar hoy |

---

## 5. Decisiones tomadas

- **2D, no 3D.** El pecado original del estilo Jarvis: en una esfera la mitad de la
  información está siempre girando por detrás. Una red 2D **se lee**. Además elimina
  Three.js del camino crítico del home (hoy con `@ts-nocheck` y recreando toda la
  escena WebGL en cada cambio de nodos: `dispose()` + `forceContextLoss()`).
- **La navegación se disuelve en el objeto.** No vas a "Academia": tocás *tu* nodo hueco
  y te lleva a la prueba de *esa* habilidad. Los nodos aburridos (Billetera, Bóveda,
  Contratos, Gobernanza, Mercado, Red) bajan a un cajón explícito y legible.
- **La Credencial es la sombra sólida de la red.** Se comparten solo los nodos probados.
  Lo hueco es privado (es tu tarea, no le importa a nadie). Así la Credencial pasa a ser
  infalsificable por construcción: no puede mostrar lo no probado porque no se dibuja.
- **Un solo objeto para toda la app.** Hoy hay dos orbes distintos de la misma persona
  (home 3D decorativo + Credencial SVG con `nodes = skills.length`). Queda uno.

---

## 6. Incrementos (cada uno mergeable solo)

- [x] **Inc 1 — El cable.** ✅ PR #392. Registro de pruebas por nombre
      (`omicron_skill_proofs`), cotización del Fondo (`omicron_fund_quote`), `gapEngine`
      real con tests, modelo de la Red Viva, y el arreglo del `p_score` hardcodeado.
- [x] **Inc 5 — Examen de cualquier habilidad.** ✅ Corte #1 roto. `omicron_ensure_skill_node`
      materializa el nodo al vuelo (uuid real) cuando la habilidad no está en el catálogo,
      así la Edge Function la encuentra sin necesidad de redeploy. Se hizo antes que el
      Inc 2 a propósito: un tablero donde la mitad de los nodos dicen "todavía no hay
      examen" es un tablero que no se puede jugar.
- [ ] **Inc 2 — La red se ve en el centro.** Promoverla al centro del home + el cajón de
      navegación explícito. Muerte de los `%` inventados del `levelMap`.
- [ ] **Inc 3 — La ficha, afinada.** Ya existe (Inc 1); falta pulido y el estado LATIENDO
      real (hoy no hay forma de saber que un examen está en curso: `exam_sessions` no
      tiene policy de lectura para el dueño).
- [ ] **Inc 4 — Los 2 segundos.** La animación de la prueba: el nodo se llena, la arista
      punteada al empleo se solidifica, el Fondo baja y la Billetera sube, a la vista.
- [ ] **Inc 6 — La Credencial = sombra sólida.** Reusar la misma red, filtrada a probados.
- [ ] **Inc 7 — Limpieza.** Borrar `config/nodes.ts` y `config/hubs.ts` (muertos, y con
      labels que contradicen al home), `BottomNav`, `HubSubNav`, y unificar el vocabulario
      de nivel (hoy conviven `LevelBand`, `NODE_TIERS` y `node_level`).

---

## 7. Riesgos aceptados

| Riesgo | Mitigación |
|---|---|
| **El Fondo está en 0** → el tablero mostraría $0 en todo | Bloqueante externo: `supabase db push` + `omicron_fund_seed(50000)`. Mientras esté en 0 la app dice la verdad: *"El Fondo está en 0 por ahora. Tus ejes igual suben."* |
| Los RPC nuevos no aplicados en producción | El hook **degrada elegante**: si el RPC no existe, todo cae a estado *declarado* y no se rompe nada |
| `OrbShell` son 1.869 líneas en un solo componente | Montaje quirúrgico. La red nueva se agrega al lado; el orbe viejo no se borra hasta que la nueva esté aprobada |
| Pagar por exámenes invita a trampa | Ya resuelto en el SQL: 1 premio por (usuario, skill) histórico, tope diario, recorte por saldo. Es imposible repartir plata que no existe |
| Monetizar el conocimiento puede abaratarlo | El premio se cobra **una vez** por habilidad. Después el nodo sólido vale por lo que habilita (empleos), no por la recompensa |
