#!/usr/bin/env bash
# গতি পরীক্ষা (§২০.৪): "বড় স্কুল" ডেটা বানিয়ে মূল কুয়েরির সময় মাপে; সীমা পার হলে ফেল।
# লোকাল: Docker-এর DB কন্টেইনারে; CI: psql দিয়ে সরাসরি।
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
run() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$1"
  else
    docker exec -i "$(docker ps --filter name=supabase_db --format '{{.Names}}' | head -1)" \
      psql -U postgres -q -v ON_ERROR_STOP=1 < "$1"
  fi
}
for f in supabase/bench/01_big_school_setup.sql supabase/bench/02_queries.sql supabase/bench/03_assert.sql; do
  run "$f"
done
