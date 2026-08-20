# Portadas en el cartón de bingo

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `packages/database` (seed), `apps/api` (contrato de cartón), `apps/web`

## Problema

El cartón es una retícula de títulos. Funciona, pero desaprovecha lo que ya
está guardado: **las portadas existen**. `Album.coverUrl` está en el esquema
(`schema.prisma:212`) y el importador de Spotify lo rellena en cada importación
(`spotify.service.ts:52`).

Hoy no lo consume nadie: `coverUrl` no aparece en el realtime, ni en el
contrato de sala, ni en una sola línea de `apps/web`. Es una vena muerta.

## Decisión

Opción del bingo, apagada por defecto: **«Casillas con portada»**. Con ella, la
casilla muestra la carátula del álbum, desenfocada mientras la canción no se
haya revelado y nítida en cuanto se revela.

**El desenfoque es recompensa visual, no ocultación.** En el bingo cada jugador
ya ve los títulos de sus propias casillas desde el principio: la portada no
esconde ningún secreto que se pueda espiar. Eso quita de en medio el problema
que tendría este diseño en cualquier otro modo, y permite resolverlo entero en
CSS, sin proxy de imágenes ni retención en el servidor.

Va **apagada por defecto** porque depende de que la colección traiga portadas, y
la de muestra hoy no las trae.

## Cambios

### 1. Configuración

`musicBingoConfigSchema` gana un campo:

```ts
/** Las casillas muestran la carátula del álbum, nítida al revelar. */
showArtwork: z.boolean().default(false),
```

Va en `modeConfig` y no en `GameSettings`, coherente con el spec de
configuración por modo: es específico del bingo.

En el wizard aparece dentro de la sección del bingo, junto al selector de
variante. Si la colección elegida no tiene portadas suficientes, la casilla se
ofrece deshabilitada con el motivo escrito («esta colección no tiene
carátulas»), en lugar de dejar activar algo que no se verá.

Umbral: la colección necesita portada en al menos el 80 % de sus pistas. Por
debajo, un cartón medio vacío queda peor que uno de solo texto.

### 2. Contrato del cartón

Cada celda del cartón lleva `coverUrl: string | null` junto al título y el
artista que ya envía. Es aditivo; una celda sin portada se pinta como hoy.

### 3. Colección de muestra

El seed no rellena `coverUrl`. Se genera una carátula propia por pista —bloques
de color derivados del título, en la paleta de la marca— servida desde
`apps/web/public`. No se descargan portadas comerciales al repositorio: la
demo tiene que poder distribuirse sin arrastrar material de terceros.

### 4. Casilla con portada

- La imagen ocupa la casilla; el título queda encima con un velo para que se
  lea. **El texto no desaparece nunca**: la portada es un añadido, no un
  sustituto, y el cartón tiene que seguir siendo jugable con la imagen sin
  cargar.
- Sin revelar: `blur` medio y saturación baja.
- Al revelar: transición corta a nítido.
- Con `prefers-reduced-motion`, el cambio es instantáneo, sin transición.
- Las imágenes se cargan con `next/image`; el dominio de la CDN de Spotify hay
  que declararlo en `remotePatterns`, y las carátulas de la demo son locales.

## Qué no se toca

- Los demás modos. La portada del álbum sí delataría la respuesta en un quiz de
  título, así que esta opción es exclusiva del bingo.
- El motor: no cambia ni la generación de cartones ni el marcado.

## Pruebas

- Unitaria del umbral de cobertura: 80 % justo, por debajo y colección vacía.
- E2E de bingo con `showArtwork`: la casilla sin revelar tiene la clase de
  desenfoque, y tras el reveal no la tiene.
- E2E de bingo sin la opción: no se pide ninguna imagen.
- Que el título siga siendo legible sobre la portada, comprobado en contraste.

## Riesgos

- **Peso y red.** Un cartón 5×5 son 25 imágenes remotas en móviles ajenos y
  redes de salón. Hay que pedirlas al tamaño pequeño que ya ofrece la CDN y
  medir el cartón grande antes de dar esto por bueno.
- **Enlaces caducados.** `coverUrl` guarda una URL de la CDN de Spotify, que
  puede dejar de responder. El fallo debe degradar a la casilla de solo texto,
  nunca a un hueco roto.
- Las carátulas generadas para la demo son trabajo de diseño, no solo de
  código: conviene resolverlas con `gramola-design-taste` a la vista.
