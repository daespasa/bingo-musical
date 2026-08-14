# Copy de la portada

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/web/src/app/page.tsx`

## Problema

La portada es de una sola pantalla: rótulo, párrafo, dos botones y una tira de
tres «créditos» (`page.tsx:19-31`). El texto arrastra tres defectos:

1. **Habla de mecánica interna, no de valor.** «Nadie puede colar una marca ni
   cantar una línea que no tiene. Se comprueba todo» describe una decisión de
   servidor. A quien entra le da igual, y encima solo se entiende si ya sabe
   cómo funciona el bingo.
2. **Sigue siendo una portada de bingo** en un producto con cinco modos. Los
   otros cuatro aparecen de refilón, en una enumeración dentro del párrafo.
3. **Los tres créditos no comparten criterio.** «Jugadores» habla de cómo se
   entra, «Música» de qué se importa y «Reglas» de antitrampas: tres ejes
   distintos que no suman una idea.

El rótulo «Tu música. Vuestro juego.» sí funciona y se queda.

## Decisión

Reescribir el párrafo y los tres créditos manteniendo la estructura y el
diseño. No es un rediseño: no se añaden secciones, no se toca la composición
del disco saliendo de la funda ni la retícula.

Criterio del nuevo texto:

- Responder en un vistazo a **qué es**, **qué hace falta** y **qué se juega**.
- Un solo eje para los tres créditos: los tres pasos de montar una partida.
- Sin jerga de bingo. Sin promesas de infraestructura.

## Cambios

### 1. Párrafo del rótulo

Sustituye a `page.tsx:62-65`. Dice qué es y qué cuesta empezar, sin listar los
cinco modos —eso es trabajo de los créditos—:

> Pon la música, comparte un código de seis letras y que cada móvil sea un
> mando. Sin instalar nada y sin cuenta para quien juega.

### 2. Los tres créditos

Un eje común —los tres pasos— y en el tercero es donde entra la variedad de
modos, que es el argumento que la portada estaba desperdiciando:

| Etiqueta        | Texto                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| `Tu música`     | Empieza con la colección de muestra o importa cualquier lista pública de Spotify. |
| `Su móvil`      | Entran con el código o el QR. Nada que instalar, ninguna cuenta que crear.        |
| `Vuestro juego` | Bingo, quiz, adivina la canción, supervivencia o una mezcla de todo.              |

Las etiquetas recogen el rótulo, así que la tira se lee como su desarrollo en
lugar de como tres datos sueltos.

### 3. El resto se queda

Rótulo, botones «Crear partida» / «Entrar con código», enlace «Acceder» y la
ilustración no cambian.

## Alternativa descartada

Añadir una sección con las cinco tarjetas de modo bajo el rótulo. Duplicaría el
selector que ya existe dentro del producto y rompería la portada de una sola
pantalla, que es de las decisiones más acertadas del diseño actual.

## Pruebas

- El test que impide que reaparezca «Bingo Musical» como nombre de producto
  sigue pasando: «Bingo» aquí es un modo de juego, uso legítimo.
- Comprobación visual en 360 px y en escritorio: los tres créditos siguen
  cabiendo en una fila a partir de `sm` sin desbordar.

## Riesgos

- El tercer crédito enumera cinco modos y es el texto más largo de la tira. Si
  a 360 px descuadra la retícula, se acorta a «Bingo, quiz, adivinanzas,
  supervivencia o una mezcla».
- Los textos citan la marca implícitamente; no se toca `APP_BRAND`, que sigue
  siendo la fuente del nombre.
