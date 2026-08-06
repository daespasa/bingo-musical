# Sistema visual — Bingo Musical

Dirección: **funda de disco**. El producto es un juego de reconocer canciones, así
que la interfaz toma prestado el lenguaje de una edición en vinilo: papel hueso,
tinta cálida, naranja de etiqueta discográfica, rótulos en grotesca negra y datos
en monoespaciada. Nada de degradados de color, cristal esmerilado ni manchas
difuminadas.

## Color

| Token       | Claro     | Uso                                                    |
| ----------- | --------- | ------------------------------------------------------ |
| `slate-50`  | `#faf6ec` | Papel: fondo y superficie de las tarjetas              |
| `slate-900` | `#1a1613` | Tinta: texto principal y canto de cada elemento        |
| `slate-950` | `#100e0c` | Laca: fondo en modo oscuro                             |
| `brand-600` | `#cf3a00` | Acción: botones primarios, enlaces, etiqueta del disco |
| `emerald-*` | `#3d7a46` | Casilla acertada                                       |
| `amber-*`   | `#e0a53b` | Línea y bingo                                          |
| `accent-*`  | `#b3402a` | Error y casilla descartada                             |

Las rampas `slate`, `emerald`, `amber` y `rose` se **redefinen** en
`tailwind.config.ts` en vez de añadir nombres nuevos: la aplicación entera adopta
la paleta sin reescribir cada clase. `accent` y `rose` son deliberadamente la
misma tinta porque toda la aplicación ya usaba `accent-500` para los errores.

Un solo acento manda (el naranja). El verde, el oro y el ladrillo tienen un
único trabajo cada uno y no compiten por la atención.

## Tipografía

| Rol    | Familia       | Dónde                                            |
| ------ | ------------- | ------------------------------------------------ |
| Rótulo | Archivo Black | Titulares, botones, nombres de sala y de canción |
| Texto  | Archivo       | Párrafos e interfaz                              |
| Dato   | DM Mono       | Códigos de sala, tiempos, puntuaciones, créditos |

`next/font` las descarga al compilar y las sirve desde el propio dominio: no hay
peticiones a terceros en tiempo de ejecución. Todo lo que es un dato va en
monoespaciada, lo que hace que un código de sala se lea como un código.

## Forma

Canto de 2 px en tinta, radio pequeño y **sombra dura desplazada**
(`shadow-sleeve`) en lugar de sombras difuminadas: los elementos parecen
apoyados sobre el papel. Los botones se hunden al pulsarlos (`active:translate-y`
y la sombra desaparece) como una tecla física, en vez de flotar al pasar por
encima.

## Firma: el disco

Un vinilo dibujado en CSS (`.vinyl`): surcos con `repeating-radial-gradient`,
etiqueta naranja, agujero central que deja ver el papel del fondo.

No es decoración, **informa del estado**:

- En la portada gira despacio junto a la funda, cuya carátula es un cartón real.
- En la sala de espera está parado: la partida no ha empezado.
- Durante la ronda gira mientras suena el fragmento y **se para** cuando se
  cierra la ventana para marcar, así que se puede saber si aún se puede marcar
  sin leer nada.

El giro va siempre en un elemento hijo: `animate-spin-record` escribe
`transform` y borraría cualquier centrado hecho con `translate`.

## Códigos de sala

El código de seis caracteres se escribe en **casillas separadas**, una por
carácter, en monoespaciada. Por debajo es un único campo de texto: el teclado,
el pegado, el autorrelleno y los lectores de pantalla siguen viendo un solo
control. Seis campos encadenados romperían el pegado y el borrado hacia atrás.

El alfabeto (`ROOM_CODE_ALPHABET`, en `@bingo/shared`) no tiene ceros ni oes,
ni unos ni íes ni eles, porque el código se lee en voz alta o desde el otro
lado de la habitación. Lo comparten el servidor que los genera y el formulario
que los recoge, así que no pueden discrepar.

Escanear el QR es un atajo, nunca la única vía: el botón solo aparece si el
navegador trae el detector de códigos, y si se deniega la cámara lo dice y
deja escribir el código a mano.

## Reglas de calidad

- Contraste: el texto secundario usa `slate-500`/`slate-400`, calibrados sobre
  papel hueso; el naranja de acción (`brand-600`) pasa AA sobre papel y con
  texto blanco encima.
- Foco visible en oro (`ring-amber-500`) en todos los elementos interactivos.
- Objetivos táctiles de 44 px como mínimo (`min-h-11`) y botones a ancho completo
  por debajo de 640 px.
- `prefers-reduced-motion` detiene el disco y el resto de animaciones.
- Modo claro y oscuro con la misma paleta, no dos temas distintos.
