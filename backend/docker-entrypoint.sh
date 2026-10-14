#!/bin/sh
set -eu

export POSTGRES_USER="${POSTGRES_ADMIN_USER:-${POSTGRES_USER:-petroledger}}"
export POSTGRES_PASSWORD="${POSTGRES_ADMIN_PASSWORD:-${POSTGRES_PASSWORD:-petroledger}}"
export DATABASE_USER="$POSTGRES_USER"
export DATABASE_PASSWORD="$POSTGRES_PASSWORD"
python /app/provision_database.py --create-role
python manage.py migrate --noinput
python /app/provision_database.py --grant
export POSTGRES_USER="${POSTGRES_APP_USER:-petroledger_app}"
export POSTGRES_PASSWORD="${POSTGRES_APP_PASSWORD:-petroledger_app}"
export DATABASE_USER="$POSTGRES_USER"
export DATABASE_PASSWORD="$POSTGRES_PASSWORD"
exec "$@"
