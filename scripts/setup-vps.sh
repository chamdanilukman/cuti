#!/bin/bash
# Setup self-hosted Supabase-compatible API on Oracle VPS Ubuntu 24.04 ARM
# Run as root or with sudo
set -e

echo "=== [1/7] Update system ==="
apt-get update -y && apt-get upgrade -y

echo "=== [2/7] Install Docker Compose & Caddy ==="
apt-get install -y docker-compose-v2 caddy

mkdir -p /opt/supabase
cd /opt/supabase

echo "=== [3/7] Generate secrets ==="
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ANON_KEY=$(openssl rand -hex 32)
SERVICE_ROLE_KEY=$(openssl rand -hex 32)
echo "Generated secrets, saving to .env"

cat > .env <<EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DOMAIN=138.2.100.73
EOF

echo "=== [4/7] Create docker-compose.yml ==="
cat > docker-compose.yml <<'YAML'
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgrest:
    image: postgrest/postgrest:v12.2.3
    restart: always
    environment:
      PGRST_DB_URI: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      PGRST_DB_ANON_ROLE: anon
      PGRST_DB_SCHEMAS: public
      PGRST_JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy

  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config

volumes:
  postgres-data:
  caddy-data:
  caddy-config:
YAML

echo "=== [5/7] Create Caddyfile (HTTP only, no SSL for IP) ==="
cat > Caddyfile <<EOF
:80 {
  @postgrest path /rest/*
  reverse_proxy postgrest:3000

  handle /healthz {
    respond "OK" 200
  }

  handle / {
    respond "Supabase-compatible API is running. Use /rest/v1/ for PostgREST" 200
  }
}
EOF

echo "=== [6/7] Create init SQL (anon role + grants) ==="
cat > init.sql <<'SQL'
-- Anon role for PostgREST
CREATE ROLE anon NOLOGIN NOINHERIT;
GRANT anon TO postgres;

-- Auth schema placeholder
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant basic access
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
SQL

echo "=== [7/7] Start services ==="
docker compose up -d

echo ""
echo "=========================================="
echo "Setup complete!"
echo "API endpoint: http://138.2.100.73:3000"
echo "Postgres: postgres:5432 (internal) or 138.2.100.73:5432"
echo "Password saved in /opt/supabase/.env"
echo ""
echo "Next steps:"
echo "1. Copy backup.sql from your PC: scp backup.sql ubuntu@138.2.100.73:/opt/supabase/"
echo "2. Restore: docker exec -i \$(docker ps -q -f name=postgres) psql -U postgres < /opt/supabase/backup.sql"
echo "3. Add storage policies (custom code in your app)"
echo "=========================================="
