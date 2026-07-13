#!/usr/bin/env bash
# Deploy aislado del Cuaderno Digital: usa el token de worker/.env (cuenta docente),
# SIN tocar el login global de wrangler (compartido con otros proyectos de esta máquina,
# ej. jarvis-core con la cuenta personal). Ver ../cuaderno/SETUP.md paso 2.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Falta worker/.env — copiá worker/.env.example a worker/.env y completá el token." >&2
  exit 1
fi

set -a
source .env
set +a

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "worker/.env existe pero CLOUDFLARE_API_TOKEN está vacío." >&2
  exit 1
fi

echo "Deployando con token de API (cuenta docente) — login global de wrangler intacto."
npx wrangler deploy
