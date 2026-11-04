#!/usr/bin/env bash
# Two managers are the only managers. Two connections demote them at the same moment.
# Expectation: exactly one demotion succeeds; the other fails with last_admin_manager; one manager remains.
# Usage: DB_URL=... ./last_manager_race.sh  (needs the seed loaded; it demotes tom first, then restores all three managers at the end)
set -euo pipefail
DB_URL="${DB_URL:?set DB_URL}"
P="psql $DB_URL -v ON_ERROR_STOP=0 -qtA"
$P -c "update public.profiles set role='admin' where email='tom@example.test';" >/dev/null
a=$(mktemp); b=$(mktemp)
# each session holds its transaction open for a second after the update, so the two overlap
$P -c "begin; update public.profiles set role='admin' where email='mia@example.test'; select pg_sleep(1); commit;" >"$a" 2>&1 &
$P -c "begin; update public.profiles set role='admin' where email='max@example.test'; select pg_sleep(1); commit;" >"$b" 2>&1 &
wait
managers=$($P -c "select count(*) from public.profiles where role='admin_manager' and status='active';")
fails=$(cat "$a" "$b" | grep -c 'last_admin_manager' || true)
# restore
$P -c "update public.profiles set role='admin_manager' where email in ('mia@example.test','max@example.test','tom@example.test');" >/dev/null
if [ "$managers" = "1" ] && [ "$fails" = "1" ]; then echo "ok: one demotion won, one was refused"; exit 0; fi
echo "FAIL: managers left=$managers refusals=$fails"; cat "$a" "$b"; exit 1
