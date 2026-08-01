# Mapa de propiedad — quién puede tocar qué

> Con varios carriles trabajando en paralelo, el 90% de los conflictos se evita
> con una sola regla: **cada archivo tiene un dueño a la vez.**
>
> Este archivo es el contrato. Si vas a tocar algo fuera de tu zona, avisá antes.

---

## Zonas libres — un carril por carpeta, sin coordinación

Son carpetas autocontenidas. Dos carriles en dos unidades distintas **nunca** chocan.

| Zona | Path | Regla |
|---|---|---|
| Unidad | `unidades/{slug}/**` | Un carril por unidad. Incluye su `card.html` y `card.json`. |
| Cápsula | `capsulas/{slug}/**` | Un carril por cápsula. |

Un carril de contenido toca **solo** su carpeta. Nada más. Con eso alcanza para
publicar la unidad completa: el cuaderno, la guía docente, la presentación y la
card de la portada.

---

## Zonas de dueño único — reservar antes de entrar

Son archivos compartidos por todo el sitio. Los puede tocar **un solo carril a la vez**,
y ese carril lo declara en su ficha (`.jarvis/branches.d/{carril}.md`, campo
**Zona de propiedad**).

| Zona | Path | Dueño actual |
|---|---|---|
| Núcleo del cuaderno | `cuaderno/js/**`, `cuaderno/css/**`, `cuaderno/competencias/**` | _(libre)_ |
| Worker | `worker/**` | _(libre)_ |
| Firebase | `firebase/**`, `firestore.rules`, `firebase.json` | `migrar-firebase` |
| JS del sitio | `js/**` | _(libre)_ |
| Portada y separadores | `contenido/**` | _(libre)_ |
| Herramientas | `tools/**` | _(libre)_ |
| Config del repo | `.gitattributes`, `.gitignore` | _(libre — avisar siempre)_ |

Antes de tocar una zona de dueño único:

1. `powershell tools\carril.ps1 -Action listar` — mirá qué hay abierto.
2. Revisá si algún otro carril la declaró en su ficha.
3. Si está libre, declarala en la tuya. Si no, esperá o coordiná con Pablo.

---

## Zona prohibida — generada, nadie la edita

| Archivo | Por qué |
|---|---|
| `index.html` | **Artefacto generado.** Lo produce `tools/build-index.ps1` desde las cards. Editarlo a mano se pierde en el siguiente build y genera conflictos en todos los carriles a la vez. |

Para cambiar la portada:

- ¿Una card de unidad? → `unidades/{slug}/card.html` (tu zona, libre)
- ¿El orden del trayecto? → el campo `orden` del `card.json` correspondiente
- ¿Un separador, el hero o el pie? → `contenido/` (zona de dueño único)

Después: `powershell tools\build-index.ps1 -Action build` y commiteá el `index.html`
regenerado junto con tu cambio.

---

## Las tres reglas que rompen todo si se ignoran

**1. Nunca `git add .` ni `git commit -a`.**
Siempre por ruta explícita: `git add unidades/mi-unidad/`. Un `add .` se lleva
trabajo a medio hacer de otras zonas y lo publica.

**2. Nunca `git checkout main`, `git stash` ni `git pull` en el worktree de otro.**
Cada carril vive en `carriles/{nombre}/` y solo se mueve ahí adentro.

**3. `index.html` se regenera, no se edita.**
Si `tools/build-index.ps1 -Action verificar` falla, tu commit rompe la portada.
Corré `-Action build` antes de commitear.
