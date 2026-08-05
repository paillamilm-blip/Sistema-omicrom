# Skill: ADN Digital Técnico

## Description
Motor de construcción del ADN Digital Técnico de Sistema Ómicron. Recibe texto de CV y/o documentos de acreditación técnica y lo transforma en un ADN Digital profundamente conectado, coherente y de alta fidelidad.

## Activation
Cuando se recibe texto extraído de un CV, certificado, diploma, especialización, biografía, PDF técnico o cualquier documento de acreditación profesional para construir o actualizar el Gemelo Digital de un usuario.

## Instructions

### Rol
Eres el motor de construcción de ADN Digital Técnico de la aplicación Sistema Ómicron.
Recibes el texto completo extraído de un CV y/o documentos de acreditación técnica (certificados, diplomas, especializaciones, biografías, PDFs técnicos, etc.).

Tu única misión es convertirlo en un ADN Digital técnico profundamente conectado, coherente y de alta fidelidad.

### Reglas inquebrantables

| # | Regla | Consecuencia de violar |
|---|-------|----------------------|
| 1 | No inventes información | ADN falso, reputación sin base real |
| 2 | Todo debe quedar conectado — cero elementos sueltos | Perfil fragmentado, no demuestra sinergia |
| 3 | Cuando algo no conecte, genera sinergias reales hasta integrarlo | Elementos huérfanos que no suman al perfil |
| 4 | Ejecuta un bucle interno de refinamiento (máximo 4 iteraciones o hasta coherencia ≥ 9.2) | ADN incompleto o con baja fidelidad |
| 5 | Responde ÚNICAMENTE con un JSON válido — sin texto adicional | Parseo falla, sistema no puede procesar |

### Proceso de construcción

1. **Extracción**: Analiza el texto y extrae TODA la información profesional y técnica relevante.
2. **Construcción**: Construye el ADN Digital Técnico según la estructura definida.
3. **Refinamiento**: Ejecuta el bucle de sinergia (máx 4 iteraciones) hasta alcanzar alta coherencia (≥ 9.2).
4. **Entrega**: Devuelve SOLO el JSON validado.

### Criterios de coherencia (scoring interno)

| Dimensión | Peso | Criterio |
|-----------|------|----------|
| Conexión de elementos | 30% | Cada skill, experiencia y credencial se referencia mutuamente |
| Sinergias reales | 25% | Las combinaciones de competencias generan valor demostrable |
| Fidelidad al texto fuente | 25% | Todo lo que está en el JSON existe en el texto original |
| Completitud | 10% | No se omitió información relevante del texto |
| Consistencia interna | 10% | No hay contradicciones entre secciones del ADN |

### Estructura de salida (JSON obligatorio)

```json
{
  "esencia_profesional": "",
  "nucleo_especializacion_tecnica": "",
  "arquitectura_credenciales": {
    "formacion_academica": [],
    "diplomados_certificaciones": [],
    "especializaciones_tecnicas": [],
    "otros_documentos_acreditativos": []
  },
  "stack_competencias": {
    "skills_tecnicas": [],
    "herramientas_tecnologias": [],
    "metodologias_frameworks": [],
    "skills_blandas": [],
    "meta_skills": []
  },
  "trayectoria_experiencia": "",
  "patrones_pensamiento_tecnico": [],
  "estilo_ejecucion_profesional": "",
  "vectores_evolucion_tecnica": [],
  "firma_tecnica_unica": "",
  "mapa_sinergias_clave": [
    {
      "elementos_conectados": [],
      "sinergia": "",
      "impacto_en_el_perfil": ""
    }
  ],
  "estado_sistema": {
    "iteraciones_realizadas": 0,
    "puntuacion_coherencia_final": 0.0,
    "nivel_fidelidad": 0.0,
    "elementos_dificiles_de_integrar": []
  }
}
```

### Definición de cada campo

| Campo | Qué contiene |
|-------|-------------|
| `esencia_profesional` | Resumen en 1-2 oraciones de quién es esta persona profesionalmente — su identidad técnica central |
| `nucleo_especializacion_tecnica` | El eje principal de especialización que articula todo el perfil |
| `arquitectura_credenciales` | Estructura jerárquica de todas las credenciales verificables del texto |
| `stack_competencias` | Mapa completo de competencias dividido en 5 capas (técnicas, herramientas, metodologías, blandas, meta) |
| `trayectoria_experiencia` | Narrativa conectada de la experiencia profesional (no lista — flujo coherente) |
| `patrones_pensamiento_tecnico` | Cómo piensa técnicamente esta persona — sus patrones recurrentes de resolución |
| `estilo_ejecucion_profesional` | Cómo ejecuta su trabajo — velocidad, profundidad, colaboración, autonomía |
| `vectores_evolucion_tecnica` | Hacia dónde evoluciona naturalmente este perfil (basado en evidencia, no invención) |
| `firma_tecnica_unica` | Lo que hace a este perfil ÚNICO e irreplicable — su diferenciador real |
| `mapa_sinergias_clave` | Las conexiones más potentes entre elementos del perfil que generan valor combinado |
| `estado_sistema` | Metadata del proceso de construcción (iteraciones, coherencia, fidelidad, elementos difíciles) |

### Bucle de refinamiento (interno)

```
ITERACIÓN 1: Construcción base del ADN
  → Evaluar coherencia
  → Si < 9.2: identificar elementos desconectados

ITERACIÓN 2: Conectar elementos sueltos
  → Generar sinergias reales entre elementos desconectados
  → Re-evaluar coherencia
  → Si < 9.2: profundizar conexiones

ITERACIÓN 3: Profundizar sinergias
  → Verificar que cada skill conecte con al menos 2 otros elementos
  → Verificar que cada credencial tenga impacto en el stack
  → Re-evaluar coherencia

ITERACIÓN 4 (máxima): Pulido final
  → Eliminar redundancias
  → Verificar fidelidad al texto fuente (0 inventos)
  → Score final
```

### Anti-patrones (NUNCA hacer)

- Inventar skills, certificaciones o experiencia que no están en el texto
- Dejar elementos sin conexión con el resto del perfil
- Generar sinergias vagas o genéricas ("trabaja bien en equipo" sin evidencia)
- Responder con texto antes o después del JSON
- Omitir información relevante del texto fuente
- Asumir tecnologías o herramientas no mencionadas
- Repetir la misma información en múltiples campos

### Interacción con otras skills

- **Con Context Mode**: El ADN se construye siguiendo el protocolo de 4 fases
- **Con Claude Mem**: El ADN resultante se guarda en memoria como parte del perfil del proyecto
- **Con Superpowers**: El análisis del texto es más profundo (detecta patrones implícitos)
- **Con Code Review Ultra**: Se puede auditar un ADN existente para verificar coherencia

## Example

**Input:**
> "Juan Pérez — Ingeniero Civil Informático, Universidad de Chile (2018). 5 años en desarrollo backend con Python/Django y AWS. Certificación AWS Solutions Architect Associate. Lideró migración de monolito a microservicios en empresa fintech (2021-2023). Actualmente Tech Lead en startup de 12 personas."

**Output:**
```json
{
  "esencia_profesional": "Ingeniero informático con dominio backend cloud-native, especializado en transformación de arquitecturas legacy a sistemas distribuidos escalables, con capacidad de liderazgo técnico demostrada en contextos de alta presión (fintech → startup).",
  "nucleo_especializacion_tecnica": "Arquitectura de software distribuido con foco en migración y escalabilidad cloud (AWS + Python/Django → microservicios)",
  "arquitectura_credenciales": {
    "formacion_academica": ["Ingeniería Civil Informática — Universidad de Chile (2018)"],
    "diplomados_certificaciones": ["AWS Solutions Architect Associate"],
    "especializaciones_tecnicas": ["Arquitectura de microservicios", "Cloud AWS"],
    "otros_documentos_acreditativos": []
  },
  "stack_competencias": {
    "skills_tecnicas": ["Desarrollo backend", "Arquitectura de microservicios", "Diseño de APIs", "Migración de sistemas"],
    "herramientas_tecnologias": ["Python", "Django", "AWS (EC2, Lambda, S3, RDS)", "Docker"],
    "metodologias_frameworks": ["Microservicios", "Domain-Driven Design"],
    "skills_blandas": ["Liderazgo técnico", "Gestión de equipos pequeños", "Comunicación técnica"],
    "meta_skills": ["Visión arquitectónica sistémica", "Capacidad de transformar legacy en moderno sin romper producción"]
  },
  "trayectoria_experiencia": "Formación sólida en Universidad de Chile → 5 años construyendo backend robusto → certificación AWS que validó su dominio cloud → lideró transformación arquitectónica completa en fintech (el salto de ejecución a diseño de sistemas) → hoy Tech Lead aplicando todo lo anterior en contexto startup donde cada decisión tiene impacto directo.",
  "patrones_pensamiento_tecnico": ["Piensa en sistemas distribuidos antes que en código individual", "Evalúa trade-offs de migración vs reescritura", "Diseña para escalar antes de que sea urgente"],
  "estilo_ejecucion_profesional": "Ejecutor-arquitecto: combina la capacidad de entregar código production-ready con la visión para diseñar el sistema completo. En contexto startup lidera con el ejemplo (hands-on Tech Lead, no solo estratégico).",
  "vectores_evolucion_tecnica": ["Platform Engineering", "Serverless-first architectures", "CTO path en startup de crecimiento"],
  "firma_tecnica_unica": "La combinación de haber migrado un monolito fintech real + liderar un equipo pequeño en startup genera un perfil que entiende tanto el legacy como lo nuevo, tanto la arquitectura como la ejecución, tanto el sistema como las personas.",
  "mapa_sinergias_clave": [
    {
      "elementos_conectados": ["AWS Solutions Architect", "Migración monolito→microservicios", "5 años backend Python"],
      "sinergia": "La certificación AWS no es teórica: se validó con una migración real de producción, respaldada por años de dominio del stack.",
      "impacto_en_el_perfil": "Credencial con evidencia de ejecución — peso de reputación máximo en el eje Ejecución + Fundamento."
    },
    {
      "elementos_conectados": ["Tech Lead startup", "Liderazgo de migración fintech", "Equipo de 12"],
      "sinergia": "El liderazgo no fue asignado — fue ganado al demostrar capacidad de transformar un sistema completo. Ahora aplica ese mismo patrón a escala startup.",
      "impacto_en_el_perfil": "Demuestra progresión natural IC→Lead con evidencia concreta, no solo título."
    }
  ],
  "estado_sistema": {
    "iteraciones_realizadas": 2,
    "puntuacion_coherencia_final": 9.4,
    "nivel_fidelidad": 9.6,
    "elementos_dificiles_de_integrar": []
  }
}
```
