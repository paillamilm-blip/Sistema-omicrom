# Claude Council SKILL

> Basado en la metodología LLM Council de Karpathy.
> Integrado como steering rule para invocar en cualquier decisión crítica del proyecto.

## Triggers de activación

**MANDATORY:** "council this", "run the council", "war room this", "pressure-test this", "stress-test this", "debate this"

**STRONG (con decisión real):** "should I X or Y", "which option", "what would you do", "is this the right move", "validate this", "get multiple perspectives", "I can't decide", "I'm torn between"

**NO activar en:** preguntas simples sí/no, búsquedas factuales, o "should I" sin un tradeoff significativo.

## Proceso del Council

### Fase 1: Convocatoria (5 asesores independientes)

Cada asesor analiza desde un ángulo fundamentalmente diferente:

| # | Rol | Perspectiva |
|---|-----|-------------|
| 1 | **El Estratega** | Visión de negocio, mercado, competidores, timing, ROI |
| 2 | **El Arquitecto** | Viabilidad técnica, deuda técnica, escalabilidad, mantenibilidad |
| 3 | **El Abogado del Diablo** | Riesgos, puntos ciegos, qué puede salir mal, worst case |
| 4 | **El Usuario** | UX, adopción, fricción, valor percibido, primera impresión |
| 5 | **El Pragmático** | Recursos reales, timeline, MVP vs. ideal, qué cortar |

### Fase 2: Análisis independiente

Cada asesor produce:
- **Posición** (1 frase): a favor, en contra, o condicional
- **Razonamiento** (3-5 puntos): por qué
- **Riesgo principal** que ve
- **Recomendación concreta**

### Fase 3: Peer review cruzado (anónimo)

Cada asesor revisa los argumentos de los demás y señala:
- ¿Qué argumento de otro asesor es el más fuerte?
- ¿Qué argumento de otro asesor tiene un punto ciego?

### Fase 4: Síntesis del Chairman

El Chairman (yo) consolida:
1. **Consenso:** dónde coinciden 4/5 o más
2. **Disenso:** dónde hay desacuerdo legítimo
3. **Veredicto final:** GO / NO-GO / GO CON CONDICIONES
4. **Acciones inmediatas:** qué hacer en las próximas 24h

## Reglas

- Los asesores NO se coordinan entre sí (análisis independiente).
- El Abogado del Diablo SIEMPRE busca fallos (no puede ser neutral).
- El Chairman NO puede ignorar un riesgo señalado por 2+ asesores.
- Si 3/5 dicen NO-GO, el veredicto es NO-GO (mayoría simple).
- El output siempre incluye "Confidence Level" (1-10) del veredicto.
