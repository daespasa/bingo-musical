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
