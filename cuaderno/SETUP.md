# Cuaderno Digital — Setup de cuentas (una sola vez, costo $0)

> Tres pasos manuales que requieren TUS cuentas. Todo lo demás ya está en el repo.
> Ninguno pide tarjeta de crédito.

## Regla de cuenta — TODO va en Profesor (2026-07-12)

**Taller de Proyecto se integra entero con la cuenta docente** (`pablo.roca@philips.edu.ar` /
Google School Essentials). La cuenta personal es para otros proyectos, no para este —
ninguna pieza de este sistema nace en la personal.

Auditado en vivo el 2026-07-12: **no hay nada creado todavía en ningún lado fuera de
Profesor** para este proyecto. GitHub + Pages ya estaban en `Prof-Pablo-Roca-Philips`.
Cloudflare y Firebase no tienen ningún recurso desplegado — cero que normalizar.

⚠️ **Único riesgo real a cuidar:** `wrangler` (Cloudflare) queda logueado a nivel de
**máquina completa**, no por proyecto — y hoy esta máquina tiene sesión activa con la
cuenta **personal** (la usa `jarvis-core`). Ver la nota de aislamiento en el paso 2.

## 1. Proyecto Firebase (identidad + datos) — ~5 min

1. Entrar a https://console.firebase.google.com con **la cuenta docente**
   (`pablo.roca@philips.edu.ar` o el admin de Google School Essentials de la escuela).
   NUNCA la personal — este proyecto nace institucional, sin transferencia después.
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

1. Cuenta gratis en https://dash.cloudflare.com creada/logueada con **la cuenta docente**
   (un mail escolar, o `pablo.roca@philips.edu.ar` si Cloudflare lo acepta como alta nueva).
   NUNCA la personal — es la misma cuenta que usa `jarvis-core` en otro proyecto y no
   queremos mezclarlos.

2. **Aislamiento (importante):** `wrangler login` guarda la sesión a nivel de toda la
   máquina, no por carpeta — si hacés login acá con la cuenta docente, le pisás la sesión
   a `jarvis-core` (que usa la personal) hasta que vuelvas a loguear la otra. Para no
   pisar nada, usar un **token de API** scopeado solo a este Worker, sin tocar la sesión
   global — ya está armado, solo falta el token:
   - Cloudflare Dashboard (logueado como docente) → **My Profile → API Tokens →
     Create Token** → plantilla "Edit Cloudflare Workers" → limitar a la cuenta docente.
   - `cp worker/.env.example worker/.env` y pegar el token adentro (ese archivo NO se
     commitea, ya está en `.gitignore`).
   - Deployar con `worker/deploy.sh` (carga el token solo para ese comando, sin tocar el
     login global de la máquina):
     ```bash
     cd worker
     ./deploy.sh
     ```
   **No usar `wrangler login` interactivo con la cuenta docente como atajo** — pisaría la
   sesión global de la máquina y rompería cualquier sesión activa de `jarvis-core` (usa la
   cuenta personal, login persistente) sin avisar. `deploy.sh` es el único camino: no toca
   ese archivo global, por eso conviven sin coordinarse.

3. Anotar la URL que devuelve (`https://taller-cuaderno-api.<subdominio-docente>.workers.dev`).
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
