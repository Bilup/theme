#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
PORT=15609
TOKEN=test-session

cleanup() {
    test -z "${PID:-}" || kill "$PID" 2>/dev/null || true
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

cd "$ROOT"
"$HOME/osl/osl" compile main.osl -o "$TMP/bilme" >/dev/null
cp -R templates static mods.json "$TMP/"
mkdir -p "$TMP/data/users" "$TMP/data/sessions"
NOW=$(($(date +%s) * 1000))
printf '%s' '{"username":"mist","authType":"rotur","themes":[],"createdAt":'"$NOW"'}' >"$TMP/data/users/admin-id.json"
printf '%s' '{"userId":"admin-id","username":"mist","authType":"rotur","createdAt":'"$NOW"'}' >"$TMP/data/sessions/$TOKEN.json"

cd "$TMP"
PORT=$PORT APP_URL="http://127.0.0.1:$PORT" ./bilme >/dev/null 2>&1 &
PID=$!

i=0
until curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; do
    i=$((i + 1))
    test "$i" -lt 30 || exit 1
    sleep 0.1
done

AUTH="Authorization: Bearer $TOKEN"
curl -fsS -H "$AUTH" "http://127.0.0.1:$PORT/api/user" | grep -q '"isAdmin":true'
curl -fsSI -X OPTIONS -H 'Origin: https://example.com' "http://127.0.0.1:$PORT/api/theme" | grep -qi 'access-control-allow-origin: \*'

CREATED=$(curl -fsS -H "$AUTH" -H 'Content-Type: application/json' -X POST \
    --data '{"themes":[{"name":"Smoke Theme","description":"test","platform":"mistwarp","themeJson":{"platform":"mistwarp","themes":[{"name":"Smoke Theme","accent":null,"gui":"light","blocks":"three","menuBarAlign":"center"}]}}]}' \
    "http://127.0.0.1:$PORT/api/theme")
UUID=$(printf '%s' "$CREATED" | node -pe 'JSON.parse(require("fs").readFileSync(0)).uuids[0]')
curl -fsS "http://127.0.0.1:$PORT/themes" | grep -q 'Smoke Theme'

REPORT=$(curl -fsS -H "$AUTH" -H 'Content-Type: application/json' -X POST \
    --data '{"uuid":"'"$UUID"'","reason":"smoke test"}' \
    "http://127.0.0.1:$PORT/api/report")
REPORT_ID=$(printf '%s' "$REPORT" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -fsS -H "$AUTH" -H 'Content-Type: application/json' -X POST \
    --data '{"id":"'"$REPORT_ID"'","action":"delete-theme"}' \
    "http://127.0.0.1:$PORT/api/admin/report/resolve" | grep -q '"ok":true'
curl -sS "http://127.0.0.1:$PORT/api/theme?uuid=$UUID" | grep -q 'theme not found'

echo "Bilme smoke test passed"
