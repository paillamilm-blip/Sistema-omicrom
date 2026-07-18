# CONTEXTO_SINTESIS.md — Documento Ejecutivo de Comprension del Sistema

> **Rol:** Arquitecto de Software Principal
> **Fecha:** 18 de julio de 2026
> **Estado:** Validacion de conocimiento previo a cualquier modificacion de codigo

---

## 1. Proposito Central

**Sistema Omicron es un marketplace de capital intelectual** que transforma el conocimiento y la capacidad humana en valor economico verificable.

### El problema que resuelve

El circulo vicioso clasico: *"sin experiencia no me contratan; sin que me contraten no gano experiencia."* Los CVs se inventan, las resenas se compran. No existe una forma universal de demostrar competencia real desde cero.

### La solucion

Una **reputacion verificable e imposible de falsear** — el **Gemelo Digital** — calculada a partir de evidencia real (contratos completados, calificaciones de clientes, nodos de conocimiento validados, aportes al ecosistema). Opera bajo una arquitectura de **confianza cero**: nada se asume, todo se prueba.

### Modelo de doble demanda

| Lado | Rol | Que obtiene |
|------|-----|-------------|
| **Oferta (talento)** | Estudiantes, tecnicos, profesionales | Reputacion verificable + oportunidades + ingresos |
| **Demanda (paga)** | Empresas + pares | Talento validado con metricas reales del Gemelo |

### Fuentes de ingreso

1. Comision por contrato (8-15% del escrow)
2. Suscripciones Premium (empresas: busqueda por Gemelo; talento: visibilidad/cursos)
3. Boveda de Conocimiento (comision sobre consultas + regalias encadenadas)
4. Boosts/destacados (tokens o dinero)

### Dos carriles economicos (NUNCA fusionados)

| Carril | Naturaleza | Uso |
|--------|-----------|-----|
| Tokens (Omega) | Puntos internos, **no son dinero** | Gamificacion, desbloqueos, destacar perfil |
| Dinero real | Pasarela + Escrow (Fase 2) | Pagar contratos, comisiones, retiros con KYC |

---

## 2. Reglas del Gemelo Digital

### Formula maestra (fuente unica de verdad)

```
experience_score = promedio(Ejecucion, Calidad, Trascendencia, Fundamento)   # 0-100

base      = 0.20 * traditional_score + 0.80 * experience_score    # lo que TIENES
momentum  = min(15, sqrt(pe_points) / 4)                          # lo que PUEDES conseguir
reputation_score = min(100, base + momentum)                       # 0-100, tiempo real
```

**Reglas de oro:**
- La reputacion se calcula **solo en el servidor** (triggers SQL `SECURITY DEFINER`).
- El cliente **lee pero nunca escribe** estos campos (trigger `protect_profile_columns` revierte).
- `experience_score` es una **columna derivada** (promedio de los 4 ejes), **no** un acumulador.
- El matching de empleos usa la **misma** formula → `matchScore == reputation_score`.

### Los 4 ejes del Gemelo Digital

| Eje | Que mide | Se alimenta de | Formula simplificada |
|-----|----------|----------------|---------------------|
| **Ejecucion** (`execution_score`) | Entregas reales | Contratos `RELEASED` como vendedor | `min(100, n_contratos * 12)` |
| **Calidad** (`quality_score`) | Excelencia | Calificaciones 1-5 del comprador | `promedio(estrellas)/5 * 100`; sin datos = 50 |
| **Trascendencia** (`transcendence_score`) | Aporte al ecosistema | Servicios + docs Boveda + mentorias | `min(100, servicios*8 + docs*12 + mentorias*6)` |
| **Fundamento** (`foundation_score`) | Base de conocimiento | Nodos del arbol de skills VALIDATED/MASTERED | `% ponderado por dificultad` |

### Evolucion del Nodo (niveles por reputacion)

| Nivel | Nombre | Umbral de reputacion | Desbloquea |
|-------|--------|---------------------|------------|
| N1 | Estudiante | 0-49 | Aprender, primeros retos, micro-trabajos |
| N2 | Tecnico | 50-79 | Vender servicios, tomar contratos, calificar |
| N3 | Arquitecto | 80-100 | Mentorias, arbitraje (Tribunal de Pares), Boveda avanzada |
| N4+ | Pioneer | Fase 2 (gobernanza/staking) | Apelaciones senior, poder de gobernanza |

### Rol de los PE (Puntos de Experiencia)

Los PE cumplen **dos funciones**:
1. **Suben de nivel** (`node_level`): N1->N2 = 1000 PE, N2->N3 = 2500 PE.
2. **Suman a la reputacion como momentum acotado** (max +15, con sqrt para rendimientos decrecientes).

### Anti-inflacion

- Comprar no da reputacion.
- El cliente no puede escribir scores.
- Solo la evidencia validada por el servidor cuenta.
- Penalizaciones (PMC) restan reputacion + tokens.
- Depreciacion suave de tokens tras 90 dias sin uso (5-10% mensual).

---

## 3. Arquitectura Tecnica

### Stack principal

| Capa | Tecnologia | Responsabilidad |
|------|-----------|-----------------|
| **Frontend** | React 18 + TypeScript + Vite 5 | SPA con Suspense/lazy loading por tab |
| **Estilos** | Tailwind CSS + design system (`src/theme.ts`) | Paleta holografica oscura, tokens C/FONT/RADIUS |
| **Animacion** | Framer Motion + GSAP + Canvas 2D puro | Nucleo 3D interactivo (requestAnimationFrame) |
| **Backend** | Supabase (Postgres + Auth + Realtime + Edge Functions + Storage) | Logica de negocio, auth, datos |
| **Deploy** | Vercel (PWA instalable) | CI/CD automatico en push a main |

### Modulos criticos del frontend

| Modulo | Archivo | Funcion |
|--------|---------|---------|
| Nucleo 3D | `HoloNucleo3D.tsx` | Canvas data-driven: esfera de Fibonacci, nodos con ejes, parallax, pointer events |
| Oraculo | `OraculoBar.tsx` + `lib/oraculo.ts` | Voz bidireccional (SpeechRecognition + SpeechSynthesis) |
| Motor Proactivo | `lib/proactiveEngine.ts` | 7 detectores de eventos (greeting, milestone, network_surge, etc.) |
| Voz | `lib/voiceEngine.ts` | SpeechSynthesis con seleccion de voz premium espanola |
| Estado global | `store/AppContext.tsx` | Auth + profile + gemelo + unreadCount + real-time updates |
| Realtime | `store/RealtimeContext.tsx` | Presence + Broadcast + postgres_changes |
| Reputacion | `services/reputationService.ts` | Calculo local (espejo del trigger SQL), historial |
| CV Analyzer | `lib/cvAnalyzer.ts` | Extraccion de skills + calculo de 4 ejes desde texto |
| Gemelo Profile | `lib/gemeloProfile.ts` + `hooks/useGemeloProfile.ts` | Store local + merge con Supabase canonico |

### Flujo de datos de reputacion

```
[Evento real] → Trigger SQL server-side (0015-0018, 0050)
    → Recalcula eje afectado
    → Recalcula experience_score (promedio 4 ejes)
    → Recalcula reputation_score (base + momentum)
    → postgres_changes → Canal real-time
    → AppContext detecta UPDATE en profiles → setProfile(nuevo)
    → useGemeloProfile refleja → UI se actualiza
```

### Base de datos (tabla central)

**`profiles`** (extension de `auth.users`):
- Campos de identidad: `id`, `username`, `full_name`, `avatar_url`, `display_name`
- Campos de reputacion (protegidos por trigger): `reputation_score`, `execution_score`, `quality_score`, `transcendence_score`, `foundation_score`, `traditional_score`, `experience_score`
- Campos de gamificacion: `pe_points`, `node_level`, `node_type`, `node_status`, `token_balance`
- Campos de economia: `total_contracts_completed`, `total_earnings`, `is_verified_professional`

### Seguridad (confianza cero)

- **RLS** (Row Level Security) en todas las tablas.
- Trigger `protect_profile_columns` revierte escrituras de scores desde el cliente.
- Convalidacion de credenciales via RPC `SECURITY DEFINER`.
- Ejes se actualizan solo por triggers ante eventos reales (contrato liberado, calificacion, etc.).

---

## 4. Logica del Oraculo

### Arquitectura del Oraculo

El Oraculo tiene **tres niveles de respuesta**, ordenados de menor a mayor costo/latencia:

| Nivel | Fuente | Latencia | Costo | Condicion de activacion |
|-------|--------|----------|-------|------------------------|
| **1. Local** | Interpretacion de intents + datos del perfil | 0ms | $0 | Siempre (primera opcion) |
| **2. Proactivo** | Motor local (`proactiveEngine.ts`) | 0ms | $0 | Contexto temporal + estado del usuario |
| **3. Coach IA** | Edge Function `coach` (Gemini) | 1-5s | $$$ | Solo si el usuario pide consejo explicitamente |

### Nivel 1: Respuestas locales (sin IA, sin red)

El `interpret()` en `lib/oraculo.ts` parsea la frase y la clasifica en:

- **navigate** → Abre un tab. Triggers: "abre billetera", "ve a empleos", etc.
- **convalidate** → Registra convalidacion (CV/titulo/anio/boveda). Triggers: "convalida mi CV".
- **fact** → Responde datos del perfil (reputacion, tokens, PE). Triggers: "cuanta reputacion tengo".
- **unknown** → Mensaje de ayuda generico.

**Condicion:** Se evalua SIEMPRE como primera opcion. Si matchea, no hay costo ni latencia.

### Nivel 2: Motor proactivo (sin IA, sin red)

El `proactiveEngine.ts` ejecuta **7 detectores** que observan el contexto local:

| Detector | Condicion exacta | Cooldown |
|----------|-------------------|----------|
| `detectGreeting` | Primera apertura del dia (o cada 4h) | 4 horas |
| `detectNetworkSurge` | `onlineCount - lastOnlineCount >= 3` | Ninguno (inmediato) |
| `detectOpportunity` | Match >= 90% en nueva oferta | 2 horas |
| `detectMilestone` | Cruce de umbral de rep (50, 80) o PE (100, 500, 1000, 2000, 5000) | Unico |
| `detectReminder` | Goal activo con priority >= 3, horario laboral (9-18h) | 24 horas |
| `detectInactivity` | 3-7 dias sin login | Por sesion |
| `detectSuggestion` | Patron recurrente detectado (ej: consultar empleos los lunes) | Contextual |

El orquestador `evaluateProactiveEvents()` ejecuta todos los detectores y retorna el de **mayor prioridad** (1-5).

**Condicion:** Se evalua al montar `HoloGemeloHome`. **Costo: $0.** Usa solo SpeechSynthesis nativa + datos locales.

### Nivel 3: Coach IA (Edge Function — UNICO que genera costo real)

**Condicion EXACTA de activacion:**

```typescript
const COACH_TRIGGERS = [
  'consejo', 'coach', 'recomienda', 'recomiénda', 'qué estudio', 'que estudio',
  'cómo mejoro', 'como mejoro', 'mi brecha', 'diagnóstico', 'diagnostico',
  'qué hago', 'que hago', 'oriénta', 'orienta', 'aconseja', 'guíame', 'guiame',
];
```

**Solo se activa si:**
1. El usuario dice una frase que contiene alguna de las palabras de `COACH_TRIGGERS`.
2. Y la frase NO matcheo antes con navigate, convalidate, ni fact (la cadena de interpretacion es exclusiva).

**Implementacion:** Llama a `supabase.functions.invoke('coach')` → Edge Function que consulta Gemini con el contexto del perfil.

**Mecanismos de control de costos:**
- Solo se invoca con trigger explicito del usuario (nunca automatico/proactivo).
- Degradacion con gracia: si la Edge Function no esta desplegada o falla, se muestra error sin romper la app.
- El texto de respuesta se limita a 320 caracteres para la voz (evita TTS largas).
- El motor proactivo (Nivel 2) cubre el 90% de las interacciones sin IA.

### Motor de voz (SpeechSynthesis nativa)

- **No usa APIs de TTS en la nube** → Costo: $0 (usa Web Speech API del navegador).
- Selecciona automaticamente la mejor voz espanola (Google > Microsoft > Apple > fallback).
- Pitch 1.08 (calidez), rate 0.95 (claridad), pausas inteligentes en puntos/comas.
- Cancela sintesis previa antes de cada nueva emision.

### Reconocimiento de voz (SpeechRecognition nativa)

- **No usa APIs de STT en la nube** → Costo: $0 (usa Web Speech API del navegador).
- Idioma: `es-ES`, no continuo, con interim results.
- Se activa solo al presionar el boton de microfono (nunca escucha pasivamente).

---

## 5. Resumen de principios de diseno

1. **Una sola fuente de verdad** para la reputacion (Supabase `profiles`).
2. **El servidor calcula, el cliente refleja** — nunca al reves.
3. **Confianza cero**: toda metrica deriva de evidencia auditada por triggers.
4. **El Oraculo es local-first**: 99% de las interacciones no tocan la nube.
5. **La IA (Coach) solo se activa por peticion explicita** del usuario — control total de latencia y costos.
6. **PWA-first**: funciona offline para lectura, se sincroniza al reconectar.
7. **Real-time por default**: la red se siente viva (Presence + postgres_changes).

---

*Este documento confirma comprension total del sistema. No se ha modificado ni auditado ningun codigo fuente.*
