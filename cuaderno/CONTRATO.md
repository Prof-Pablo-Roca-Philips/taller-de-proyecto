# Cuaderno Digital del Taller — Contrato v1

> Este documento es la fuente de verdad del sistema. Todo componente (motor de ejercicios,
> SDK, Worker, boletín, futura intranet) se programa contra ESTE contrato, nunca contra un
> proveedor concreto. Si mañana cambia el proveedor (Firebase → servidor de la escuela),
> cambia UN adaptador; el resto no se toca.

## Principios de portabilidad

1. **El log de intentos es la fuente de verdad.** Todo lo demás (niveles, progreso, boletín)
   es DERIVADO y recomputable. Si cambia el modelo pedagógico, se recalcula sobre los mismos
   intentos: no se pierde historia.
2. **Puertos y adaptadores.** El frontend habla con el puerto `Cuaderno` (SDK); el Worker
   habla con el puerto `Almacen`. Los proveedores (localStorage, Firebase, Firestore, D1,
   Postgres) son adaptadores intercambiables detrás de esos puertos.
3. **Definiciones declarativas.** Ejercicios y competencias son JSON en este repo, no código.
   Cualquier motor futuro puede leerlos.
4. **Exportable siempre.** Todo perfil puede exportarse completo en JSON v1 en cualquier
   momento (`exportar()` / `GET /api/exportar`). Cero lock-in.
5. **Evolución aditiva.** Los cambios al contrato agregan campos opcionales. Un cambio
   incompatible crea `v2` conviviendo con `v1`, nunca lo pisa.

## Identificadores

- Unidad: `u1`, `u2`, … Cápsula: `cap-boceto`, …
- Ejercicio: `{unidad}-e{n}` (ej. `u1-e3`). Competencia: `{unidad}-c{n}` (ej. `u1-c2`).
- Alumno: `uid` del proveedor de identidad; en modo invitado, `local`.

## Modelo de datos

### Intento (el EVENTO — inmutable, append-only)

```json
{
  "v": 1,
  "id": "it_9f2k…",
  "uid": "local",
  "ejercicio": "u1-e3",
  "unidad": "u1",
  "puntaje": 0.75,
  "detalle": { "respuesta": [2, 0, 1, 3], "correctas": 3, "total": 4 },
  "ts": "2026-07-12T14:03:00Z",
  "origen": "web"
}
```

`puntaje` está SIEMPRE normalizado 0..1. La conversión a escala escolar es asunto del
boletín (derivado), no del evento.

### Ejercicio (declarativo — vive en el HTML de la página, bloque `application/json`)

```json
{
  "v": 1,
  "id": "u1-e1",
  "tipo": "opcion-multiple",
  "competencias": ["u1-c2"],
  "consigna": "…",
  "datos": { "opciones": ["…"], "correcta": 1, "explicaciones": ["…"] }
}
```

Tipos v1: `opcion-multiple` · `verdadero-falso` · `ordenar` · `numerico`.
Reservados (fases siguientes): `abierta` (feedback IA), `evidencia` (entrega de archivo/foto).

### Competencias (por unidad — `cuaderno/competencias/{unidad}.json`)

```json
{
  "v": 1,
  "unidad": "u1",
  "competencias": [
    { "id": "u1-c2", "nombre": "Del problema vago al técnico", "descripcion": "…" }
  ]
}
```

### Niveles (derivados — política v1 en `js/niveles.js`)

Escala: `0 Sin evidencia · 1 Inicial · 2 En desarrollo · 3 Logrado · 4 Superado`.

Política v1 (`mejor-intento`): por cada ejercicio se toma el MEJOR puntaje; el nivel de una
competencia es el promedio de los mejores puntajes de sus ejercicios con evidencia, mapeado:
`<0.40 → 1 · <0.70 → 2 · <0.95 → 3 · ≥0.95 → 4` (sin intentos → 0). La política es una
función pura sobre el log: reemplazarla NO toca datos.

## Puerto `Cuaderno` (SDK frontend — `js/sdk.js`)

| Método | Devuelve | Nota |
|---|---|---|
| `init({adapter})` | sesión | `'local'` (hoy) · `'firebase'` (fase 1) |
| `getSesion()` | `{uid, nombre, modo}` | modo: `invitado` \| `alumno` |
| `login()` / `logout()` | sesión | en `local` es no-op |
| `registrarIntento(intento)` | intento persistido | append-only |
| `listarIntentos(unidad?)` | intentos | |
| `getProgreso(unidad)` | niveles por competencia | derivado con `niveles.js` |
| `exportar()` | JSON v1 completo | siempre disponible |

## API REST (Worker — fase 1+)

Base: `https://…workers.dev/api`. Auth: `Authorization: Bearer <ID token de Firebase>`,
verificado SERVER-SIDE (el cliente jamás escribe puntajes directo a la base).

| Endpoint | Semántica |
|---|---|
| `GET  /salud` | ping + versión de contrato |
| `POST /intentos` | registra intento (valida token, sella `ts` y `uid` en servidor) |
| `GET  /intentos?unidad=u1` | intentos del alumno autenticado |
| `GET  /progreso/{unidad}` | niveles derivados |
| `GET  /boletin` | boletín completo del alumno |
| `GET  /exportar` | dump JSON v1 |
| `POST /feedback` | (fase 4) respuesta abierta → Gemini → feedback |

La futura intranet/matrícula consume `GET /boletin` y `GET /exportar` con una API key de
servicio — mismo contrato, sin tocar nada del frontend.

## Qué cambia si cambia el rumbo (tabla de impacto)

| Cambio de rumbo | Qué se reescribe | Qué sobrevive intacto |
|---|---|---|
| Firebase → servidor escuela | 1 adaptador de SDK + 1 de Almacen | ejercicios, motor, niveles, boletín, datos (export/import JSON v1) |
| Otro modelo pedagógico | `niveles.js` (función pura) | todo el log de intentos, motor, UI |
| Otro motor de ejercicios | el renderer | definiciones JSON de ejercicios, datos |
| GitHub Pages → intranet | nada (HTML estático se copia) | todo |
