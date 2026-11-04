#!/usr/bin/env bash
# SANDBOX ONLY: rebuilds a plain PostgreSQL 16 database the way `supabase db reset` would (stub, migrations, reference
# triggers, seed). Needs pgTAP installed on the server. Usage: rebuild_sandbox.sh [database]
set -euo pipefail
DB="${1:-trackpoli_p1}"; HERE="$(cd "$(dirname "$0")/../.." && pwd)"
P() { runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 "$@"; }
P -c "drop database if exists $DB" -c "create database $DB" -c "alter database $DB set search_path = \"\$user\", public, extensions" >/dev/null 2>&1
P -d "$DB" -f "$HERE/tests/harness/00_supabase_stub.sql" >/dev/null
for f in "$HERE"/migrations/*.sql; do P -d "$DB" -f "$f" >/dev/null 2>&1 || { echo "migration failed: $f"; exit 1; }; done
for f in "$HERE"/manual/*.sql; do P -d "$DB" -f "$f" >/dev/null 2>&1 || { echo "manual script failed: $f"; exit 1; }; done   # run statement by statement, outside a transaction
P -d "$DB" -f "$HERE/tests/harness/007_auth_triggers_reference.sql" >/dev/null
P -d "$DB" -f "$HERE/seed.sql" >/dev/null
echo "sandbox $DB ready"
