# Seguridad

## Modelo de amenazas (MVP)

| Amenaza                                       | Mitigación                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Robo de contraseñas                           | Hash Argon2id, nunca texto plano, rate limiting en `/auth/*`                      |
| Secuestro de sesión                           | Cookies HttpOnly + SameSite=Lax + Secure en producción, expiración de sesiones    |
| Invitado accediendo a otra sala u otro cartón | Token de invitado firmado (HMAC), ligado a sala y participante, con expiración    |
| Manipulación de puntuación desde el cliente   | Toda validación de marcas/línea/bingo ocurre en servidor; el cliente nunca decide |
| Inyección (XSS) vía alias                     | Alias saneado (2-20 chars, sin HTML), escape por defecto de React                 |
| Fuerza bruta de códigos de sala               | Códigos de 6 caracteres sin ambigüedad + rate limiting + expiración de salas      |
| CSRF                                          | SameSite=Lax + CORS restringido a `WEB_URL`                                       |
| Exposición de secretos                        | `.env` fuera de Git; credenciales Spotify solo en backend                         |
| Abuso de WebSocket                            | Autenticación por token en handshake, validación de payloads, rate limiting       |

## Despliegue tras Cloudflare Tunnel

La API confía en cabeceras `X-Forwarded-*` solo cuando `trust proxy` está activo (producción). TLS termina en Cloudflare; las cookies llevan `Secure` en producción.

## Reportar vulnerabilidades

Abre un issue privado o contacta al mantenedor del repositorio.

## Modos que preguntan

En quiz, adivina, supervivencia y mixto, **la solución no sale del servidor
antes del revelado**. Están cerradas las tres vías por las que se filtraría:

- **Payload**: la ronda tiene dos formas, la interna con la respuesta y la
  pública sin ella. Una única función es la puerta de salida hacia la red, así
  que añadir un campo sensible a la ronda no lo cuela solo.
- **Acuse de recibo**: responder confirma que se ha registrado el envío y nada
  más. Un ack que dijera «correcto» revelaría la solución igual.
- **Marcador**: la puntuación se aplica al cerrar la ronda, no al responder. Un
  ranking que sube justo al pulsar delata el acierto ante toda la sala.

Hay tests de unidad y E2E que inspeccionan el HTML servido y el objeto `window`
buscando `correctIndex`, `correctText` e `isCorrect`.

## Respuesta libre

La evaluación es del servidor y con reglas explícitas: sin IA y sin servicios
externos. La comparación difusa es deliberadamente conservadora —la tolerancia
depende de la longitud— para que ninguna palabra corta valga por otra.

Con varios intentos permitidos, escribir es barato: hay un enfriamiento por
jugador además del límite de intentos, y repetir una respuesta ya probada no
gasta intento ni cuela.

## Supervivencia

Las vidas se persisten y las decide siempre el servidor. Reconectar no las
devuelve ni resucita a nadie, y a quien está eliminado el servidor le rechaza
cualquier respuesta, además de no ofrecerle el botón.

## Modo de juego

El cliente **no puede indicar** con qué reglas evaluar su partida. El modo se
fija al crearla, se persiste y el servidor lo lee de ahí; la configuración se
revalida al leerla, de forma que una fila manipulada a mano tampoco cambia las
reglas a mitad de sala.
