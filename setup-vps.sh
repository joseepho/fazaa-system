#!/bin/bash

# Fazza Pro System - VPS Setup Script
# This script installs Node.js, PM2, and Nginx on Ubuntu 22.04

echo "🚀 Starting VPS Setup for Fazaa Pro..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Essentials
echo "🛠️ Installing essential tools..."
sudo apt install -y curl git nginx build-essential

# 3. Install Node.js 20
echo "🟢 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Install PM2
echo "🔄 Installing PM2 process manager..."
sudo npm install -g pm2

# 5. Setup Project Directory
echo "xor Creating project directory at /var/www/fazza..."
sudo mkdir -p /var/www/fazza
sudo chown -R $USER:$USER /var/www/fazza

# 6. Configure Nginx
echo "🌐 Configuring Nginx..."
sudo rm /etc/nginx/sites-enabled/default

# Create Nginx config
cat <<EOF | sudo tee /etc/nginx/sites-available/fazza
server {
    listen 80;
    server_name _;  # Accepts all domains/IPs for now

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/fazza /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Setup Complete!"
echo "➡️  Next Step: Upload your 'dist' and 'package.json' files to /var/www/fazza"
