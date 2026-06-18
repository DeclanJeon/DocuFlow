#!/usr/bin/env bash
set -euo pipefail

# DocuFlow Deploy Script for docuflow.ponslink.com
# Usage: ./scripts/deploy-ponslink.sh [user@host]
# Default: ponslink

REMOTE="${1:-ponslink}"
REMOTE_DIR="/opt/docuflow"
APP_NAME="docuflow"
DOMAIN="docuflow.ponslink.com"

echo "=== DocuFlow Deploy to ${DOMAIN} ==="
echo ""

# Step 1: Build
echo "[1/8] Building production bundle..."
cd "$(dirname "$0")/.."
npm run build
echo "  Build complete."

# Step 2: Prepare remote directory
echo "[2/8] Preparing remote directory..."
ssh "${REMOTE}" "sudo mkdir -p ${REMOTE_DIR}/{dist,server-runtime,jobs,scripts,pdftomd,tools} && sudo chown -R \$(whoami):\$(whoami) ${REMOTE_DIR}"

# Step 3: Install system dependencies
echo "[3/8] Installing system dependencies on remote..."
ssh "${REMOTE}" "sudo env DEBIAN_FRONTEND=noninteractive apt-get update -qq && sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq poppler-utils qpdf ghostscript libreoffice chromium >/dev/null && echo '  system dependencies installed'"

# Step 4: Setup pdftomd Python environment
echo "[4/8] Setting up pdftomd Python environment..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && \
  if [ ! -d .venv-pdftomd ]; then python3 -m venv .venv-pdftomd; fi && \
  .venv-pdftomd/bin/pip install -q --upgrade pip && \
  .venv-pdftomd/bin/pip install -q pdfminer.six pdfplumber pypdf pdf2image rapidocr_onnxruntime && \
  echo '  pdftomd venv ready'"

# Step 4b: Verify pdftomd dependencies
echo "  Verifying pdftomd dependencies..."
ssh "${REMOTE}" "${REMOTE_DIR}/.venv-pdftomd/bin/python -c 'import pdfminer, pdfplumber, pypdf, pdf2image, rapidocr_onnxruntime; print(\"  All pdftomd dependencies OK\")'"

# Step 5: Upload files
echo "[5/8] Uploading files..."
rsync -avz --delete \
  dist/ \
  "${REMOTE}:${REMOTE_DIR}/dist/"

rsync -avz \
  server/ \
  "${REMOTE}:${REMOTE_DIR}/server/"

ssh "${REMOTE}" "mkdir -p ${REMOTE_DIR}/server-runtime/jobs ${REMOTE_DIR}/server-runtime/fixtures"

rsync -avz \
  ../pdftomd/cli/ \
  "${REMOTE}:${REMOTE_DIR}/pdftomd/"

rsync -avz \
  ../pdf-master/tools/rhwp-ingest-exporter/target/release/rhwp-ingest-exporter \
  "${REMOTE}:${REMOTE_DIR}/tools/"

rsync -avz \
  package.json \
  "${REMOTE}:${REMOTE_DIR}/"

# Step 6: Install dependencies on remote
echo "[6/8] Installing dependencies on remote..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && npm install --production 2>/dev/null || npm install"

# Step 7: Setup systemd service
echo "[7/8] Setting up systemd service..."
ssh "${REMOTE}" "sudo tee /etc/systemd/system/${APP_NAME}.service > /dev/null" <<'EOF'
[Unit]
Description=DocuFlow PDF Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/docuflow
ExecStart=/usr/bin/node server/pdf-server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=4177
Environment=PDFTOMD_PATH=/opt/docuflow/pdftomd/pdf_to_md.py
Environment=RHWP_INGEST_EXPORTER_PATH=/opt/docuflow/tools/rhwp-ingest-exporter
Environment=PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser
[Install]
WantedBy=multi-user.target
EOF

# Step 8: Setup nginx
echo "[8/8] Setting up nginx..."
if ssh "${REMOTE}" "sudo test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
  ssh "${REMOTE}" "sudo tee /etc/nginx/sites-available/${APP_NAME} > /dev/null" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root ${REMOTE_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4177;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 200M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
else
  ssh "${REMOTE}" "sudo tee /etc/nginx/sites-available/${APP_NAME} > /dev/null" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${REMOTE_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4177;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        client_max_body_size 200M;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
EOF
fi

# Enable and restart
ssh "${REMOTE}" "sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"
ssh "${REMOTE}" "sudo systemctl daemon-reload && sudo systemctl enable ${APP_NAME} && sudo systemctl restart ${APP_NAME}"

echo ""
echo "=== Deploy Complete ==="
echo "  Site: http://${DOMAIN}"
echo "  API:  http://${DOMAIN}/api/ready"
echo ""
echo "To check status:"
echo "  ssh ${REMOTE} 'sudo systemctl status ${APP_NAME}'"
echo "  ssh ${REMOTE} 'sudo journalctl -u ${APP_NAME} -f'"
