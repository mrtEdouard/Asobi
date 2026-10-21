#!/usr/bin/env bash
# Mise en production sur le VPS : a executer sur le serveur (npm run deploy le fait depuis le poste).
# Next.js tourne avec pm2 (processus "asobi", port 3001) derriere Nginx (port 8080).
set -euo pipefail

APP_DIR=/var/www/asobi/current
APP_NAME=asobi
APP_PORT=3001

cd "$APP_DIR"

echo "==> Recuperation du code"
git pull --ff-only

echo "==> Installation des dependances"
npm ci

echo "==> Build de production"
npm run build

echo "==> Redemarrage"
pm2 restart "$APP_NAME" --update-env

echo "==> Verification"
for attempt in 1 2 3 4 5; do
  if curl -fsS -o /dev/null "http://127.0.0.1:$APP_PORT/connexion"; then
    echo "OK : $(git log -1 --oneline) est en ligne."
    exit 0
  fi
  sleep 2
done

echo "ECHEC : l'application ne repond pas. Logs : pm2 logs $APP_NAME --lines 50 --nostream" >&2
exit 1
