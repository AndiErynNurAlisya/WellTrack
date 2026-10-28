#!/usr/bin/env bash
# Uji isolasi data antar pengguna. Server harus hidup:
#   bash tests/isolation_check.sh
BASE=${BASE:-http://127.0.0.1:8000/api/v1}
J="Content-Type: application/json"
STAMP=$(date +%s)
PASS=0
FAIL=0

TODAY=$(python -c "from datetime import datetime; from zoneinfo import ZoneInfo; print(datetime.now(ZoneInfo('Asia/Jakarta')).date())")

check() {
  if [ "$2" == "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"
  else FAIL=$((FAIL+1)); echo "FAIL  $1 (harapan: $2, dapat: $3)"; fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
jget() { python -c "import sys,json; d=json.load(sys.stdin); print($1)"; }
patch_body() {
  case $1 in
    targets) echo '{"name":"Diretas"}' ;;
    reminders) echo '{"is_active":false}' ;;
    *) echo '{"notes":"diretas"}' ;;
  esac
}
register_and_login() {
  curl -s -X POST $BASE/auth/register -H "$J" \
    -d "{\"name\":\"$1\",\"email\":\"$2\",\"password\":\"rahasia123\",\"confirm_password\":\"rahasia123\"}" > /dev/null
  curl -s -X POST $BASE/auth/login -H "$J" \
    -d "{\"email\":\"$2\",\"password\":\"rahasia123\"}" | jget "d['access_token']"
}

TOKEN_A=$(register_and_login "Iso A" "iso_a_$STAMP@welltrack.id")
TOKEN_B=$(register_and_login "Iso B" "iso_b_$STAMP@welltrack.id")
HA="Authorization: Bearer $TOKEN_A"
HB="Authorization: Bearer $TOKEN_B"

# ===== Pengguna A membuat satu data di setiap modul =====
A_ID=$(curl -s $BASE/users/me -H "$HA" | jget "d['id']")
ACT=$(curl -s -X POST $BASE/activity-logs -H "$HA" -H "$J" \
  -d "{\"activity_type\":\"Lari\",\"activity_date\":\"$TODAY\",\"duration_minutes\":30,\"intensity\":\"sedang\"}" | jget "d['data']['id']")
WAT=$(curl -s -X POST $BASE/water-logs -H "$HA" -H "$J" \
  -d "{\"log_date\":\"$TODAY\",\"log_time\":\"08:00:00\",\"amount\":500,\"unit\":\"ml\"}" | jget "d['data']['id']")
SLP=$(curl -s -X POST $BASE/sleep-logs -H "$HA" -H "$J" \
  -d "{\"sleep_date\":\"$TODAY\",\"sleep_start_time\":\"23:00:00\",\"sleep_end_time\":\"07:00:00\"}" | jget "d['data']['id']")
TGT=$(curl -s -X POST $BASE/targets -H "$HA" -H "$J" \
  -d '{"name":"Olahraga Iso","category":"aktivitas","target_value":30,"unit":"menit","frequency":"harian","duration_days":3}' | jget "d['id']")
REM=$(curl -s -X POST $BASE/reminders -H "$HA" -H "$J" \
  -d '{"reminder_type":"air","reminder_time":"09:00:00"}' | jget "d['id']")

echo "--- B mencoba mengakses data milik A ---"
for pair in "activity-logs:$ACT" "water-logs:$WAT" "sleep-logs:$SLP" "targets:$TGT" "reminders:$REM"; do
  path=${pair%%:*}
  id=${pair##*:}
  check "B GET    /$path/{milik A}" 404 "$(code $BASE/$path/$id -H "$HB")"
  check "B PATCH  /$path/{milik A}" 404 "$(code -X PATCH $BASE/$path/$id -H "$HB" -H "$J" -d "$(patch_body $path)")"
  check "B DELETE /$path/{milik A}" 404 "$(code -X DELETE $BASE/$path/$id -H "$HB")"
done
check "B POST /targets/{milik A}/cancel" 404 "$(code -X POST $BASE/targets/$TGT/cancel -H "$HB")"
check "B POST /reminders/{milik A}/toggle" 404 "$(code -X POST $BASE/reminders/$REM/toggle -H "$HB")"

echo "--- Daftar milik B kosong ---"
for path in activity-logs water-logs sleep-logs targets reminders; do
  check "B list /$path kosong" 0 "$(curl -s $BASE/$path -H "$HB" | jget "len(d)")"
done
check "B water daily-total" 0.0 "$(curl -s "$BASE/water-logs/daily-total?log_date=$TODAY" -H "$HB" | jget "d['total_ml']")"

echo "--- Agregasi milik B tidak memuat data A ---"
check "B dashboard aktivitas" 0 "$(curl -s $BASE/dashboard -H "$HB" | jget "d['activity_today']['count']")"
check "B dashboard air" 0 "$(curl -s $BASE/dashboard -H "$HB" | jget "d['water_today']['count']")"
check "B dashboard tidur" None "$(curl -s $BASE/dashboard -H "$HB" | jget "d['last_sleep']")"
check "B dashboard target aktif" 0 "$(curl -s $BASE/dashboard -H "$HB" | jget "len(d['active_targets'])")"
check "B dashboard poin" 0 "$(curl -s $BASE/dashboard -H "$HB" | jget "d['total_points']")"
check "B history total" 0 "$(curl -s $BASE/history -H "$HB" | jget "d['total']")"
check "B charts has_data" False "$(curl -s "$BASE/charts?period=mingguan" -H "$HB" | jget "d['has_data']")"
check "B gamification poin" 0 "$(curl -s $BASE/gamification/summary -H "$HB" | jget "d['total_points']")"
check "B gamification badge diperoleh" 0 "$(curl -s "$BASE/gamification/badges?earned=true" -H "$HB" | jget "len(d)")"

echo "--- Data A tetap utuh setelah serangan B ---"
for pair in "activity-logs:$ACT" "water-logs:$WAT" "sleep-logs:$SLP" "targets:$TGT" "reminders:$REM"; do
  check "A GET /${pair%%:*} masih ada" 200 "$(code $BASE/${pair%%:*}/${pair##*:} -H "$HA")"
done
check "A nama target tidak berubah" "Olahraga Iso" "$(curl -s $BASE/targets/$TGT -H "$HA" | jget "d['name']")"
check "A pengingat tetap aktif" True "$(curl -s $BASE/reminders/$REM -H "$HA" | jget "d['is_active']")"
check "A catatan aktivitas tidak berubah" None "$(curl -s $BASE/activity-logs/$ACT -H "$HA" | jget "d['notes']")"

echo "--- B tidak bisa memalsukan user_id ---"
check "B POST dengan user_id milik A" 201 "$(code -X POST $BASE/activity-logs -H "$HB" -H "$J" \
  -d "{\"user_id\":\"$A_ID\",\"activity_type\":\"Palsu\",\"activity_date\":\"$TODAY\",\"duration_minutes\":10,\"intensity\":\"rendah\"}")"
check "A tetap hanya punya 1 aktivitas" 1 "$(curl -s $BASE/activity-logs -H "$HA" | jget "len(d)")"
check "B punya 1 aktivitas sendiri" 1 "$(curl -s $BASE/activity-logs -H "$HB" | jget "len(d)")"

echo "--- Tanpa token dan token palsu ---"
for e in users/me activity-logs water-logs sleep-logs targets targets/templates reminders \
         gamification/summary gamification/badges dashboard history charts; do
  check "tanpa token /$e" 401 "$(code $BASE/$e)"
done
check "token palsu /users/me" 401 "$(code $BASE/users/me -H "Authorization: Bearer abc.def.ghi")"
check "token kosong /users/me" 401 "$(code $BASE/users/me -H "Authorization: Bearer ")"

echo "--- Kebocoran data sensitif ---"
check "password_hash tidak ada di /users/me" False "$(curl -s $BASE/users/me -H "$HA" | jget "'password_hash' in d")"

echo
echo "Lulus: $PASS, Gagal: $FAIL"
[ "$FAIL" -eq 0 ]