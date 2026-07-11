# 🧬 Definición Canónica de la Reputación — Sistema Ómicron

> **Fuente única de verdad del Gemelo Digital.**
> Este documento define *un solo* modelo de reputación para **todo** el ecosistema
> (aprender, vender, comprar, mentorías, freelance, contratos por empresa).
> Si algún documento, migración o componente lo contradice, **este documento manda**.
>
> _Versión 1.0 — 9 de julio de 2026._

---

## 0. El problema que resuelve (por qué existe este documento)

Hasta ahora coexistían **dos definiciones de "experiencia" que se contradecían**:

1. **Manifiesto (`DEFINICION_OMICROM.md`)**: reputación = `20% credenciales + 80% (promedio de los 4 ejes)`.
2. **Código antiguo**: `experience_score` era un **acumulador de PE** independiente, y la
   reputación se calculaba como `20% tradicional + 80% experience_score`.

Resultado: el **radar de 4 ejes** que veía el usuario **no era** lo que movía su reputación.
El frontend (`calculateMatchScore`) y el backend calculaban números distintos.

**Decisión canónica (esta versión):**

> `experience_score` **deja de ser un acumulador** y pasa a ser una **columna derivada**:
> es **exactamente el promedio de los 4 ejes**. Así ambas fórmulas dan el mismo resultado
> y el radar de 4 ejes **sí** determina la reputación.

Los **PE (Puntos de Experiencia)** siguen existiendo, pero su rol es **gamificación y niveles**,
no mover la reputación directamente (la mueven a través del eje Fundamento, ver §3).

---

## 1. Fórmula maestra

```
experience_score = promedio( Ejecución, Calidad, Trascendencia, Fundamento )   # 0–100
reputation_score = 0.20 · traditional_score  +  0.80 · experience_score        # 0–100
```

- Todos los valores viven en escala **0–100**.
- Se calculan **en el servidor** (trigger `recalc_reputation` sobre `public.profiles`).
- El cliente **nunca** escribe estos campos (los revierte el trigger `protect_profile_columns`).
- `traditional_score` = credenciales verificadas (20%). `experience_score` = desempeño real (80%).

**Ponderación 20/80** = un título ayuda, pero **el 80% se gana demostrando**. Rompe el círculo
"sin experiencia no me contratan".

---

## 2. Los cuatro ejes del Gemelo Digital

Cada eje es 0–100 y se recalcula **automáticamente** por triggers cuando ocurre una acción real.
Ningún eje se auto-declara; todos derivan de evidencia en la base de datos.

| Eje | Qué mide | Se alimenta de | Regla actual |
|-----|----------|----------------|--------------|
| 🛠️ **Ejecución** (`execution_score`) | Que entregas y cierras trabajo | Contratos `RELEASED` como vendedor | `min(100, nº_contratos × 12)` (~9 contratos = 100) |
| ⭐ **Calidad** (`quality_score`) | Qué tan bien lo haces | Calificaciones 1–5 del comprador | `promedio(estrellas)/5 × 100`; sin datos = 50 (neutral) |
| 🌱 **Trascendencia** (`transcendence_score`) | Cuánto aportas al ecosistema | Servicios en Market + docs validados en Bóveda + mentorías | `min(100, servicios×8 + docs×12 + mentorías×6)` |
| 📚 **Fundamento** (`foundation_score`) | Tu base de conocimiento | Nodos del árbol de habilidades `VALIDATED`/`MASTERED` | `% ponderado por dificultad de nodos completados` |

> **Neutral de arranque:** un usuario nuevo parte con ejes en torno a un valor base (Calidad = 50
> por defecto) para no castigar la falta de historial. La reputación inicial de referencia es **40**.

---

## 3. Rol de los PE (Puntos de Experiencia) y los Niveles

- **PE** = métrica de **progreso/gamificación**. Se acumulan al estudiar, aprobar exámenes,
  cerrar operaciones de mercado, etc. Viven en `pe_points`.
- Los PE **suben de nivel** al usuario (`node_level`), pero **no** inflan directamente la reputación.
- La formación **sí** impacta la reputación **a través del eje Fundamento** (estudiar → validar
  nodos → sube Fundamento → sube experience_score → sube reputación). El camino es indirecto y
  a prueba de inflación.

### Niveles del nodo (evolución del usuario)

| Nivel | Nombre | Umbral (reputación) | Qué desbloquea |
|-------|--------|---------------------|----------------|
| N1 | 🌱 Estudiante | 0–49 | Aprender, primeros retos, micro-trabajos |
| N2 | 🔧 Técnico | 50–79 | Vender servicios, tomar contratos, calificar |
| N3 | 🏛️ Arquitecto | 80–100 | Mentorías, arbitraje (Tribunal de Pares), Bóveda avanzada |
| N4+ | 🚀 Pioneer | (fase 2, gobernanza/staking) | Apelaciones senior, poder de gobernanza |

> Umbrales de reputación: `determineNodeLevel()` en `reputationService.ts`.
> Umbrales de PE para progreso de nivel: `calculatePEThreshold()` (N1→N2 = 1000 PE, N2→N3 = 2500 PE).

---

## 4. Cómo cada acción del ecosistema mueve la reputación

Este es el mapa que hace que **"todo se conecte con todo"**. El usuario siente que el sistema
lo posiciona en tiempo real porque **cada acción real recae en un eje**.

| Rol / Acción | Eje impactado | Efecto |
|--------------|---------------|--------|
| 🎓 **Estudiar / validar nodos** (Academia, árbol) | Fundamento ↑ | Sube base → sube reputación |
| 🧪 **Aprobar examen IA / test de skill** | PE ↑ (nivel) + Fundamento ↑ (al validar nodo) | Progreso + reputación indirecta |
| 💼 **Completar contrato freelance (vendedor)** | Ejecución ↑ | Demuestra que entregas |
| ⭐ **Recibir calificación del comprador** | Calidad ↑/↓ | Refleja satisfacción real |
| 🏢 **Contrato con empresa (RELEASED)** | Ejecución ↑ (+ Calidad si califican) | Igual que freelance, mayor peso por volumen |
| 🛒 **Comprar** en Market/Bóveda | PE ↑ (actividad) | No sube reputación directa (evita "comprar" reputación) |
| 🏪 **Publicar servicio en Market** | Trascendencia ↑ | Aportas oferta al ecosistema |
| 📖 **Publicar doc validado en Bóveda** | Trascendencia ↑ | Capitalizas conocimiento |
| 🧑‍🏫 **Completar mentoría** | Trascendencia ↑ | Elevar a otros cuenta |
| 🎖️ **Convalidar credencial** (título/portafolio) | Tradicional ↑ (tope 60/70 vía RPC) | 20% de la reputación |
| ⚠️ **Penalización (PMC)** | Reputación ↓ + tokens ↓ | Mala conducta, disputas perdidas |

> **Anti-inflación:** comprar, auto-declararse o escribir el score desde el cliente **no** sube
> la reputación. Solo la evidencia validada por el servidor cuenta (triggers `SECURITY DEFINER`).

---

## 5. Los dos carriles económicos (no confundir con reputación)

La reputación **no es dinero**. Son planos separados:

| Plano | Métrica | Para qué |
|-------|---------|----------|
| 🧬 **Reputación** | `reputation_score` (0–100) | Confianza, ranking, matching de trabajos, acceso a niveles |
| 🪙 **Tokens (Ω)** | `token_balance` | Gamificación, desbloquear conocimiento, destacar perfil (NO son plata) |
| 💵 **Dinero real** | Escrow + pasarela | Pagar contratos (fase 2, con KYC) |

---

## 6. Decaimiento y penalizaciones (mantener la reputación "viva")

- **Calidad y Ejecución** reflejan siempre el historial acumulado (no caducan solos hoy;
  el decaimiento por inactividad es una mejora de Fase 2).
- **Tokens** sí tienen depreciación suave (5–10% mensual tras 90 días sin uso — `0045`).
- **Penalizaciones (PMC, `0042`)**: mala conducta o disputas perdidas restan reputación y tokens,
  con mecanismo de recuperación en el tiempo.
- **Auditoría automática**: una caída de reputación ≥ 15 puntos dispara revisión
  (`shouldTriggerAudit()`).

---

## 7. Matching de trabajos ("el trabajo te busca")

El puntaje que decide qué oportunidades se te ofrecen usa la **misma** reputación:

```
matchScore = 0.20 · traditional_score + 0.80 · experience_score  ==  reputation_score
```

Como ahora `experience_score = promedio de los 4 ejes`, **el match score y la reputación son el
mismo número**. Ya no hay dos verdades. (`calculateMatchScore()` en `reputationService.ts`.)

---

## 8. Dónde vive cada cosa (implementación)

| Concepto | Ubicación |
|----------|-----------|
| Fórmula maestra + trigger | `supabase/migrations/0050_reputacion_canonica.sql` |
| Eje Fundamento | `0015_foundation_from_skills.sql` |
| Eje Ejecución | `0016_execution_from_contracts.sql` |
| Eje Calidad | `0017_quality_from_ratings.sql` |
| Eje Trascendencia | `0018_transcendence.sql` |
| Blindaje anti-escritura del cliente | `0007_protect_profile.sql` / `9999_audit_consolidado.sql` |
| Convalidación de credenciales (RPC) | `0048_convalidar_credencial.sql` |
| Cálculos de cliente (deben reflejar, no calcular) | `src/services/reputationService.ts` |
| Tipo `Profile` | `src/types/index.ts` |

---

## 9. Reglas de oro (para no volver a romperlo)

1. **La reputación se calcula SOLO en el servidor.** El cliente lee, no escribe.
2. **`experience_score` es derivado** = promedio de los 4 ejes. Nunca se acumula a mano.
3. **Los PE mueven niveles, no reputación** (salvo vía Fundamento).
4. **Todo eje deriva de evidencia real** (contratos, calificaciones, nodos, publicaciones).
5. **20/80 es sagrado**: credenciales pesan 20%, desempeño demostrado 80%.
6. Si agregas una fuente nueva (p. ej. certificación externa), **decide a qué eje pertenece**
   y créale su trigger; no inventes un score paralelo.
