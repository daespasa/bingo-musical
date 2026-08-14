# Salida de partida

**Fecha**: 2026-08-11
**Estado**: aprobado, pendiente de plan
**Ámbito**: `apps/web`

## Problema

Al terminar una partida, «Salir» lleva a `/`, la portada pública. Como esa
página ofrece «Crear partida» y «Entrar con código», da la sensación de que la
sesión se ha cerrado. No se cierra —la cookie sigue viva—, pero el anfitrión
acaba de perder su sitio: para volver a lo suyo tiene que navegar otra vez
hasta `/dashboard`.

Tres botones hacen lo mismo:

| Sitio                              | Destino actual |
| ---------------------------------- | -------------- |
| `components/podium.tsx:270`        | `/`            |
| `room/[code]/results/page.tsx:50`  | `/`            |
| `room/[code]/results/page.tsx:115` | `/`            |

## Decisión

El destino depende de quién sale, porque no todo el que juega tiene cuenta:

- **Con sesión de usuario** (anfitrión, o jugador registrado): `/dashboard`.
- **Sin sesión** (invitado que entró con código): `/`, como ahora. Es su sitio:
  desde ahí puede entrar a otra sala con otro código.

Se descartó mandar a todo el mundo a `/dashboard`: un invitado llegaría a una
pantalla que le pide iniciar sesión, que es peor que la portada.

## Cambios

### 1. Hook `useIsAuthenticated`

Un hook pequeño en `lib/` sobre la consulta que ya existe:

```ts
useQuery({ queryKey: ['me'], queryFn: () => api<PublicUser>('/auth/me') });
```

Devuelve el estado en tres valores —`autenticado`, `invitado`, `cargando`— en
lugar de un booleano, para que el botón no parpadee de un destino a otro
mientras la consulta está en vuelo. `UserMenu` ya usa esa misma clave de
consulta, así que en la práctica el dato suele venir de caché.

`/auth/me` responde 401 sin sesión, y eso llega como error de la consulta, no
como `data: null`. El hook trata el 401 como `invitado` y cualquier otro fallo
como `cargando`, para no expulsar a nadie por un error de red.

### 2. Un solo componente de salida

Los tres botones se sustituyen por `<ExitGameLink />`, que resuelve el destino
con el hook y conserva el aspecto actual (`btn-secondary`, texto «Salir»).
Mientras carga, el botón se renderiza deshabilitado en lugar de apuntar a un
destino que luego cambia.

### 3. Etiqueta acorde al destino

- Autenticado: «Volver a mis partidas».
- Invitado: «Salir».

Decir a dónde lleva evita justo la lectura que provocó el aviso: que salir
equivale a cerrar la sesión.

## Qué no se toca

- `/auth/logout` y el `UserMenu`: cerrar sesión sigue siendo una acción
  explícita y aparte.
- Los enlaces a `/` de las cabeceras de login, registro y join, que son el logo
  y deben seguir yendo a la portada.

## Pruebas

- Unitaria del hook: 401 da `invitado`, respuesta correcta da `autenticado`,
  error de red da `cargando`.
- E2E: el anfitrión termina una partida, pulsa salir y aterriza en
  `/dashboard`, con la sesión intacta (el menú de usuario sigue visible).
- E2E: un invitado termina la partida y aterriza en `/`.

## Riesgos

- El podio se renderiza también en el proyector, donde no hay interacción. El
  botón se comporta igual, pero conviene comprobar que la sesión de proyector
  (`session.mode === 'PROJECTOR'`) no acaba en `/dashboard` sin cuenta detrás.
