#!/bin/bash
set -euo pipefail

REMOTE_HOST="${1:-167.172.188.248}"
REMOTE_DIR="/opt/ofshora"

echo "=== Deploying Ofshora Backend to ${REMOTE_HOST} ==="

# 1. Ensure remote directory exists
ssh "root@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}/backend ${REMOTE_DIR}/deploy"

# 2. Sync backend source code and deployment files (excluding local cache, git, tests DB)
echo "=== Syncing backend source files ==="
rsync -avz --delete \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '.pytest_cache' \
  --exclude 'staticfiles' \
  backend/ "root@${REMOTE_HOST}:${REMOTE_DIR}/backend/"

rsync -avz deploy/ "root@${REMOTE_HOST}:${REMOTE_DIR}/deploy/"

# 3. Provision remote .env if it does not exist
echo "=== Ensuring remote .env exists ==="
ssh "root@${REMOTE_HOST}" "bash -s" << 'EOF'
set -euo pipefail
ENV_FILE="/opt/ofshora/deploy/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Generating new secure secrets for staging environment..."
    PG_PASS=$(openssl rand -hex 16)
    PG_APP_PASS=$(openssl rand -hex 16)
    DJ_SECRET=$(openssl rand -base64 36)
    cat << ENV_VARS > "$ENV_FILE"
POSTGRES_DB=ofshora_staging
POSTGRES_USER=ofshora_admin
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_APP_USER=petroledger_app
POSTGRES_APP_PASSWORD=${PG_APP_PASS}
DJANGO_SECRET_KEY=${DJ_SECRET}
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=api-staging.ofshora.com,167.172.188.248,localhost,backend
DJANGO_CSRF_TRUSTED_ORIGINS=https://staging.ofshora.com,https://api-staging.ofshora.com,http://167.172.188.248
DJANGO_CORS_ALLOWED_ORIGINS=https://staging.ofshora.com,http://localhost:3000
ENV_VARS
    chmod 600 "$ENV_FILE"
    echo "Generated $ENV_FILE with secure permissions."
fi
EOF

# 4. Build and start containers with docker compose
echo "=== Starting containers on remote droplet ==="
ssh "root@${REMOTE_HOST}" "bash -s" << 'EOF'
set -euo pipefail
cd /opt/ofshora/deploy
docker compose -f compose.staging.yaml --env-file .env build --pull
docker compose -f compose.staging.yaml --env-file .env up -d --remove-orphans
echo "Waiting for healthcheck..."
sleep 8
docker compose -f compose.staging.yaml ps
EOF

echo "=== Testing public healthcheck endpoint ==="
curl -s -i "http://${REMOTE_HOST}/api/v1/health/" || true
echo ""
echo "=== Staging Deployment Complete! ==="
