# 🔍 Revisión de Usabilidad — Sistema Ómicrom
_Diagnóstico de navegación y experiencia · 27 de junio de 2026_

Objetivo: que el sistema se sienta **ordenado, claro y cómodo** para un usuario nuevo
(estudiante de ingeniería en el celular).

---

## 🔴 P0 — CRÍTICO (lo que hace sentir "desordenado")

### 1. Inconsistencia visual entre pantallas
Algunas pantallas usan el **tema cyberpunk nuevo** (Perfil, Chat, Academia, Gobernanza) y
otras el **tema viejo** (Market, Wallet, Empleos). Saltar entre ellas se siente como "dos apps".
- **Acción:** unificar TODAS al tema cyberpunk (`C`, `FONT`, `BASE`, `CyberComponents`).
- **Impacto:** altísimo. Es lo que más "ordena" la percepción.

### 2. Falta de orientación al navegar
- ✅ Ya agregamos las sub-pestañas (ÁRBOL / ACADEMIA, etc.).
- Falta: que siempre sea obvio **en qué sección estás** y **qué puedes hacer ahí**.

### 3. Sin onboarding para el día 1
Un usuario nuevo entra y no sabe por dónde empezar (¿árbol? ¿perfil? ¿credenciales?).
- **Acción:** mini-guía de bienvenida ("Tu Gemelo está en 40. Súbelo: 1) carga credenciales, 2) supera un curso").

---

## 🟡 P1 — IMPORTANTE

### 4. Estados vacíos con llamado a la acción
"SIN CONTRATOS" o listas vacías deberían **guiar**: ej. "Aún no tienes contratos → ve al Market a contratar/ofrecer".

### 5. Feedback de acciones consistente
Cada acción (guardar, contratar, calificar) debe mostrar **cargando → éxito/error** con un toast claro.
- El modal de error de contrato ("No se pudo procesar") es **alarmante**; suavizar el tono.

### 6. Jerga sin explicar
Términos como **PE, Nodo Operativo, Gemelo, Trascendencia, Escrow** son pesados para un novato.
- **Acción:** tooltips (ícono "?") o explicarlos en el onboarding.

### 7. Truncamientos en móvil
- El hub **"GOBERN"** aparece cortado → usar "JUSTICIA" o ícono + texto corto.
- Nombres de nodos largos se cortan ("Matemáticas Operativa") → permitir 2 líneas.

---

## 🔵 P2 — PULIDO

### 8. "Radar ansioso" → reframe positivo (tu propia idea H-07)
Los ejes bajos del Gemelo no deben verse como "fallas", sino como
**"Disparadores de Redención"**: "Tu Fundamento está en 35 → supera este reto de 10 min para subirlo".

### 9. Accesibilidad básica
- Contraste de textos tenues (gris sobre oscuro) un poco bajo.
- Áreas de toque ≥ 44px en móvil.

### 10. Consistencia fina
- Mismos espaciados, radios y tamaños de ícono en todas las tarjetas.
- Un solo estilo de botón primario/secundario/peligro.

---

## 🖥️ Notas por pantalla (observadas)

| Pantalla | Observación |
|----------|-------------|
| **MaxSkill** | El botón amarillo "Iniciar Reto" domina demasiado; nombres de nodos se cortan; el "3% completado" podría motivar más ("¡2 de 11 nodos!"). |
| **Perfil** | ✅ Mejoró con sub-secciones (Gemelo/Credenciales/Capacidades). |
| **Chat** | Empty state correcto, falta CTA hacia el Market. |
| **Market / Contrato** | El modal de error asusta; suavizar mensaje y tono. |

---

## 🗺️ Plan sugerido (encaja en Semana 4 del roadmap)
1. **Primero (P0):** unificar Market, Wallet y Empleos al tema cyberpunk → orden inmediato.
2. Añadir **onboarding** + tooltips de jerga.
3. **Estados vacíos** con CTA + feedback consistente.
4. Pulido (radar positivo, accesibilidad, móvil).

> Recomendación: atacar el **P0 (consistencia visual)** cuanto antes, porque afecta TODA la
> percepción del producto — incluso para mostrarlo a CORFO o a la beta.
