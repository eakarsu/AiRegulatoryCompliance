#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
set -a
source "$ENV_FILE"
set +a
API_DIR="$ROOT_DIR/backend"
UI_DIR="$ROOT_DIR/frontend"
MIGRATION_DIR="$API_DIR/migrations"
read_env(){ awk -F= -v key="$1" '$0 !~ /^[[:space:]]*#/ && $1 == key {value=substr($0,index($0,"=")+1);gsub(/^[[:space:]]+|[[:space:]]+$/,"",value);gsub(/^["\047]|["\047]$/,"",value);print value;exit}' "$ENV_FILE"; }
load_key(){ local key="$1" parsed; [ -n "${!key-}" ] && return 0; [ -f "$ENV_FILE" ] || return 0; parsed="$(read_env "$key")"; [ -z "$parsed" ] || export "$key=$parsed"; }
for key in DATABASE_URL JWT_SECRET GOVERNANCE_TENANT_ID ENABLE_GENERATED_FEATURES ALLOW_SCHEMA_MIGRATION BACKEND_PORT FRONTEND_PORT PGSSLROOTCERT; do load_key "$key"; done
BACKEND_PORT="${BACKEND_PORT:-5001}"; FRONTEND_PORT="${FRONTEND_PORT:-3000}"
fail(){ printf 'error: %s\n' "$*" >&2; exit 1; }
check_config(){ local secret="${JWT_SECRET:-}"; command -v node >/dev/null||fail "node is required";command -v npm >/dev/null||fail "npm is required";[ -n "${DATABASE_URL:-}" ]||fail "DATABASE_URL is required";[ -n "${GOVERNANCE_TENANT_ID:-}" ]||fail "GOVERNANCE_TENANT_ID is required";[ "${#secret}" -ge 32 ]||fail "JWT_SECRET must contain at least 32 characters";case "$DATABASE_URL" in *example*|*changeme*|*password@*) fail "DATABASE_URL contains a placeholder";;esac;[ "${ENABLE_GENERATED_FEATURES:-false}" != "true" ]||[ "${NODE_ENV:-development}" != "production" ]||fail "generated features are forbidden in production";printf 'configuration valid for tenant %s\n' "$GOVERNANCE_TENANT_ID"; }
migrate(){ check_config;case "${ALLOW_SCHEMA_MIGRATION:-0}" in 1|true) :;;*) fail "set ALLOW_SCHEMA_MIGRATION=1 for explicit migration";;esac;command -v psql >/dev/null||fail "psql is required";for migration in "$MIGRATION_DIR"/*.sql;do [ -f "$migration" ]||continue;psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration";done; }
start_services(){ local attempt;check_config;[ -d "$API_DIR/node_modules" ]||fail "API dependencies are missing; install explicitly";[ -d "$UI_DIR/node_modules" ]||fail "UI dependencies are missing; install explicitly";(cd "$API_DIR" && exec env PORT="$BACKEND_PORT" node src/index.js) & api_pid=$!;trap 'kill "$api_pid" "${ui_pid:-}" 2>/dev/null || true;wait "$api_pid" "${ui_pid:-}" 2>/dev/null || true' INT TERM EXIT;for attempt in {1..120};do curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1&&break;kill -0 "$api_pid" 2>/dev/null||fail "API exited before becoming ready";sleep 0.25;done;curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1||fail "API did not become ready";(cd "$UI_DIR" && exec env PORT="$FRONTEND_PORT" BACKEND_PORT="$BACKEND_PORT" REACT_APP_API_URL="http://127.0.0.1:$BACKEND_PORT/api" BROWSER=none npm start) & ui_pid=$!;wait "$api_pid" "$ui_pid"; }
case "${1:-start}" in check) check_config;;migrate) migrate;;start) start_services;;*) fail "usage: $0 {check|migrate|start}";;esac
