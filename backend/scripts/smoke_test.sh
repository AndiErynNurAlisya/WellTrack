#!/usr/bin/env bash
# Pemakaian:
#   BASE=https://welltrack-api.onrender.com/api/v1 ORIGIN=https://welltrack.vercel.app bash scripts/smoke_test.sh
BASE=${BASE:?isi BASE, contoh https://xxx.onrender.com/api/v1}
ROOT=${BASE%/api/v1}
ORIGIN=${ORIGIN:-}
J="Content-Type: application/json"
STAMP=$(date +%s)
PASS=0
FAIL=0

check() {
  if [ "$2" == "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"
  else FAIL=$((FAIL+1)); echo "FAIL  $1 (harapan: $2, dapat: $3)"; fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
jget() { python -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

TODAY=$(python -c "from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo('Asia/Jakarta')).date())")

check "GET /health" 200 "$(code $ROOT/health)"
check "GET /health/db" 200 "$(code $ROOT/health/db)"

EMAIL="smoke_$STAMP@welltrack.id"
check "register" 201 "$(code -X POST $BASE/auth/register -H "$J" \
  -d "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"rahasia123\",\"confirm_password\":\"rahasia123\"}")"
TOKEN=$(curl -s -X POST $BASE/auth/login -H "$J" -d "{\"email\":\"$EMAIL\",\"password\":\"rahasia123\"}" | jget "d['access_token']")
H="Authorization: Bearer $TOKEN"

check "users/me" 200 "$(code $BASE/users/me -H "$H")"
check "users/me tanpa token" 401 "$(code $BASE/users/me)"
check "templates (7 seed)" 7 "$(curl -s $BASE/targets/templates -H "$H" | jget "len(d)")"
check "badges (6 seed)" 6 "$(curl -s $BASE/gamification/badges -H "$H" | jget "len(d)")"
check "POST aktivitas" 201 "$(code -X POST $BASE/activity-logs -H "$H" -H "$J" \
  -d "{\"activity_type\":\"Lari\",\"activity_date\":\"$TODAY\",\"duration_minutes\":30,\"intensity\":\"sedang\"}")"
check "dashboard poin 10" 10 "$(curl -s $BASE/dashboard -H "$H" | jget "d['total_points']")"
check "validasi 422 berbahasa Indonesia" "Email wajib diisi." \
  "$(curl -s -X POST $BASE/auth/register -H "$J" -d '{}' | jget "[e['message'] for e in d['errors'] if e['field']=='email'][0]")"

if [ -n "$ORIGIN" ]; then
  GOT=$(curl -s -i -X OPTIONS $BASE/users/me -H "Origin: $ORIGIN" \
    -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: authorization" \
    | tr -d '\r' | grep -i '^access-control-allow-origin:' | awk '{print $2}')
  check "CORS untuk $ORIGIN" "$ORIGIN" "$GOT"
fi

echo
echo "Lulus: $PASS, Gagal: $FAIL"
[ "$FAIL" -eq 0 ]