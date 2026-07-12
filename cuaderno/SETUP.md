# Cuaderno Digital — Setup de cuentas (una sola vez, costo $0)

> Tres pasos manuales que requieren TUS cuentas. Todo lo demás ya está en el repo.
> Ninguno pide tarjeta de crédito.

## 1. Proyecto Firebase (identidad + datos) — ~5 min

1. Entrar a https://console.firebase.google.com con la cuenta que administre el proyecto
   (sirve la personal; se puede transferir a la institucional después).
2. **Agregar proyecto** → nombre: `taller-de-proyecto-philips` → sin Google Analytics.
3. Quedarse en el plan **Spark** (gratis). NO activar Blaze: no lo necesitamos.
4. **Authentication → Comenzar → Google → Habilitar** (proveedor de acceso).
5. **Authentication → Configuración → Dominios autorizados** → agregar
   `prof-pablo-roca-philips.github.io`.
6. **Firestore Database → Crear base de datos → modo producción** (las reglas van después,
   en fase 1).
7. **Configuración del proyecto → General → Tus apps → Web (</>)** → registrar app
   `cuaderno` → copiar el bloque `firebaseConfig` y pasármelo (no es secreto: va al
   frontend igual).

## 2. Cloudflare Worker (la API) — ~5 min

1. Cuenta gratis en https://dash.cloudflare.com (si no tenés).
2. En esta carpeta del repo:
   ```bash
   cd worker
   npx wrangler login      # abre el browser una vez
   npx wrangler deploy
   ```
3. Anotar la URL que devuelve (`https://taller-cuaderno-api.<tu-subdominio>.workers.dev`).
4. Cuando exista el proyecto Firebase: en `wrangler.toml` poner `MODO_DEV = "0"` y
   descomentar `FIREBASE_PROJECT_ID`, y re-deployar.

## 3. API key de Gemini (feedback IA — recién para fase 4) — ~2 min

1. https://aistudio.google.com/app/apikey → **Create API key**.
2. NO pegarla en ningún archivo del repo. Cargarla como secreto del Worker:
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

## Qué NO hay que hacer

- No activar plan Blaze de Firebase, no poner tarjeta en ningún lado.
- No pegar keys ni `firebaseConfig` privados en archivos del repo (la key de Gemini es
  secreta; el `firebaseConfig` web es público por diseño).
- No crear Cloud Functions: la lógica de servidor vive en el Worker (gratis).
