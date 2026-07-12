# Cuaderno Digital — API (Cloudflare Worker)

Implementa el contrato v1 (`../cuaderno/CONTRATO.md`). Plan free de Cloudflare
(100K requests/día), sin costo mensual.

## Estado por fase

| Pieza | Estado |
|---|---|
| Router + contrato v1 (salud, intentos, progreso, boletín, exportar) | ✅ v0 |
| Verificación de ID token Firebase (RS256 + dominio escolar) | ✅ implementada — se activa con `FIREBASE_PROJECT_ID` |
| Adaptador `memoria` (desarrollo, datos volátiles) | ✅ |
| Adaptador `firestore` (persistencia real) | Fase 1 — se enchufa en `almacen.js` sin tocar el router |
| `POST /feedback` (Gemini) | Fase 4 |

## Probar local (sin Firebase, hoy)

```bash
cd worker
npx wrangler dev
# en otra terminal:
curl http://localhost:8787/api/salud
curl -X POST http://localhost:8787/api/intentos \
  -H "X-Dev-Uid: prueba" -H "Content-Type: application/json" \
  -d '{"ejercicio":"u1-e1","unidad":"u1","puntaje":1}'
curl http://localhost:8787/api/boletin -H "X-Dev-Uid: prueba"
```

`MODO_DEV=1` (en `wrangler.toml`) habilita el header `X-Dev-Uid` para desarrollo.
**En producción va en `"0"`** y toda petición exige un ID token de Firebase válido,
verificado server-side (firma RS256, expiración, proyecto y dominio escolar).

## Deploy (cuando exista el proyecto Firebase — ver ../cuaderno/SETUP.md)

```bash
npx wrangler deploy
```
