---
name: gramola-design-taste
description: Diseña, implementa o revisa interfaces de Gramola con criterio visual específico y sin patrones genéricos de IA. Úsala para cualquier cambio de UI, UX, estilos, componentes React, responsive, animación o accesibilidad en apps/web.
---

# Criterio visual de Gramola

Lee `DESIGN.md` completo antes de modificar la interfaz. Ese documento y la UI existente son la autoridad; esta skill solo define el proceso.

## Dirección

- Interpreta la pantalla por su trabajo, audiencia y estado dentro de la partida antes de elegir la composición.
- Conserva el lenguaje de funda de disco: papel hueso, tinta cálida, etiqueta naranja, tipografía Archivo/Archivo Black/DM Mono, bordes de 2 px y sombras duras.
- Usa el vinilo como firma funcional ligada al estado. No añadas otra firma visual que compita con él.
- Evita los clichés: gradientes decorativos, glassmorphism, brillos neón, tarjetas iguales por defecto, texto de marketing genérico y animación sin significado.
- La claridad durante una partida gana a la novedad. Diseña primero para móvil, distancia, ruido y uso con una mano.

## Proceso

1. Inspecciona la pantalla, sus componentes vecinos, `apps/web/src/app/globals.css` y `tailwind.config.ts` solo en los rangos pertinentes.
2. Define en una frase la jerarquía y el cambio visual. No presentes un ensayo de diseño.
3. Reutiliza tokens, utilidades, componentes e iconos Lucide existentes. Gramola usa Tailwind 3; no introduzcas sintaxis v4.
4. No añadas librerías de UI, fuentes o motion salvo necesidad demostrada y autorización dentro del encargo.
5. Implementa todos los estados afectados: inicial, carga, vacío, error, éxito y deshabilitado cuando correspondan.
6. Comprueba 320 px, móvil común y escritorio; evita desbordamiento y saltos de viewport.
7. Mantén foco visible, semántica, contraste, objetivos táctiles de 44 px y `prefers-reduced-motion`.
8. Valida visualmente con una captura o Playwright cuando el entorno esté disponible.

## Revisión anti-slop

Antes de terminar, elimina cualquier adorno que no explique estado o jerarquía. Confirma que la pantalla parece parte de Gramola, no una landing genérica, y que la experiencia sigue siendo legible sin animación.

Inspirada en `frontend-design` de Anthropic y `taste-skill` de Leonxlnx; adaptada para evitar sus reglas incompatibles y su coste de contexto en este proyecto.
