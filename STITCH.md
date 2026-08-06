# Google Stitch + Claude Code

Este repositorio incluye las skills oficiales `stitch-design`, `stitch-build` y
`stitch-utilities`, además de la conexión MCP compartida en `.mcp.json`.

## Activar la conexión

1. Entra en [Stitch](https://stitch.withgoogle.com), abre **Stitch settings** y crea una API key.
2. Antes de iniciar Claude Code, expórtala sin guardarla en el repositorio:

   ```bash
   export STITCH_API_KEY="tu-clave"
   claude
   ```

3. Acepta el servidor de proyecto cuando Claude lo solicite y ejecuta `/mcp` para comprobar que
   `stitch` aparece conectado.

## Flujo de diseño recomendado

Pide a Claude: “Usa Stitch para importar la interfaz actual, genera variantes responsive para
móvil y escritorio, actualiza el sistema de diseño y aplica la variante aprobada al código”.

La clave nunca debe añadirse a `.mcp.json`, `.env` ni a ningún archivo versionado.
