# LiveMultimodalAgent DigitalOcean Deployment Guide

This document provides detailed technical information about how the LiveMultimodalAgent application is deployed on DigitalOcean.

## Infrastructure Overview

- **DigitalOcean Droplet**: Debian-based Linux server
- **Domain Structure**:
  - Frontend: `Redacted`
  - Backend API: `Redacted` 
- **SSL Certificates**: Let's Encrypt
- **Web Server**: Nginx
- **Application Server**: Flask with Python virtual environment
- **Process Management**: systemd

## Directory Structure

```
/root/LiveMultimodalAgent/     # Main application code
├── app.py                     # Flask application entry point
├── llm_factory.py             # LLM provider factory
├── llm_service.py             # Base service class
├── service_*.py               # LLM service implementations
├── .env                       # API keys and configuration
├── requirements.txt           # Python dependencies
├── uploads/                   # Image upload directory
└── frontend/                  # React frontend code
    └── dist/                  # Built frontend assets

/var/www/livemultimodalagent/  # Web-accessible frontend files
/etc/nginx/sites-available/    # Nginx configuration
/etc/systemd/system/           # systemd service definition
```

## Configuration Files

### Nginx Configuration (/etc/nginx/sites-available/livemultimodalagent)

```nginx
# HTTP to HTTPS redirect
server {
    if ($host = 2point.artsensei.ai) {
return 301 https://$host$request_uri;
} # managed by Certbot
    if ($host = 1point.artsensei.ai) {
    return 301 https://$host$request_uri;
} # managed by Certbot

    listen 80;
    server_name 1point.artsensei.ai 2point.artsensei.ai;
    return 301 https://$host$request_uri;
}

# Frontend Configuration (1point.artsensei.ai)
server {
    listen 443 ssl;
    server_name 1point.artsensei.ai;
    
    ssl_certificate /etc/letsencrypt/live/history.artsensei.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/history.artsensei.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Frontend static files
    root /var/www/livemultimodalagent;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
}

# Backend API Configuration (2point.artsensei.ai)
server {
    listen 443 ssl;
    server_name 2point.artsensei.ai;
    
    ssl_certificate /etc/letsencrypt/live/history.artsensei.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/history.artsensei.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # Set client body size for the entire server
    client_max_body_size 50M;
    
    # Main API proxy
    location / {
        proxy_pass http://localhost:5003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    # LLM API endpoint
    location /v1/ {
        proxy_pass http://localhost:5003/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    
    # Handle image uploads
    location /upload_image {
        proxy_pass http://localhost:5003/upload_image;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
    
    # Serve uploaded images
    location /serve_image {
        proxy_pass http://localhost:5003/serve_image;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket connections for ElevenLabs
    location /socket.io {
        proxy_pass http://localhost:5003/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### systemd Service (/etc/systemd/system/livemultimodalagent.service)

```
[Unit]
Description=LiveMultimodalAgent Flask App
After=network.target

[Service]
User=root
WorkingDirectory=/root/LiveMultimodalAgent
Environment="PATH=/root/LiveMultimodalAgent/venv/bin"
ExecStart=/root/LiveMultimodalAgent/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Environment Configuration (/root/LiveMultimodalAgent/.env)

```
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
LLM_PROVIDER=OpenAI
DEFAULT_MODEL=GPT-4o
```

## Deployment Procedures

### Initial Server Setup

```bash
# Update system packages
apt update && apt upgrade -y

# Install required tools
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

# Clone repository
git clone https://github.com/yourusername/LiveMultimodalAgent.git /root/LiveMultimodalAgent

# Set up Python environment
cd /root/LiveMultimodalAgent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads
chmod 755 uploads
```

### Frontend Deployment

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Build frontend
cd /root/LiveMultimodalAgent/frontend
npm install
npm run build

# Set up web directory
mkdir -p /var/www/livemultimodalagent
cp -r dist/* /var/www/livemultimodalagent/
chown -R www-data:www-data /var/www/livemultimodalagent
chmod -R 755 /var/www/livemultimodalagent
```

### Nginx Setup

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/livemultimodalagent

# Enable the site
ln -s /etc/nginx/sites-available/livemultimodalagent /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site if desired

# Test and reload configuration
nginx -t
systemctl reload nginx
```

### SSL Certificate Setup

```bash
# Obtain SSL certificates
certbot --nginx -d Redacted -d Redacted

# SSL renewal cron job (should be automatically created by certbot)
echo "0 3 * * * certbot renew --quiet" | crontab -
```

### Backend Service Setup

```bash
# Create systemd service
nano /etc/systemd/system/livemultimodalagent.service

# Enable and start service
systemctl daemon-reload
systemctl enable livemultimodalagent
systemctl start livemultimodalagent
```

### Firewall Configuration

```bash
# Install UFW (Uncomplicated Firewall) if not already installed
apt install -y ufw

# Set up basic firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

## Updating the Application

### Frontend Updates

```bash
# Pull latest code
cd /root/LiveMultimodalAgent
git pull

# Update frontend dependencies and rebuild
cd frontend
npm install
npm run build

# Copy to web directory
cp -r dist/* /var/www/livemultimodalagent/
```

### Backend Updates

```bash
# Pull latest code
cd /root/LiveMultimodalAgent
git pull

# Update dependencies
source venv/bin/activate
pip install -r requirements.txt

# Restart service
systemctl restart livemultimodalagent
```

## Monitoring and Logs

### Application Logs

```bash
# View live application logs
journalctl -u livemultimodalagent -f

# View recent application logs
journalctl -u livemultimodalagent -n 100
```

### Web Server Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### System Monitoring

```bash
# Install monitoring tools
apt install -y htop iotop

# Monitor system resources
htop

# Monitor disk I/O
iotop
```

## Backup Procedures

### Database Backup (if applicable)

```bash
# Create backup directory
mkdir -p /root/backups

# Backup application files
tar -czvf /root/backups/livemultimodalagent-$(date +%Y%m%d).tar.gz /root/LiveMultimodalAgent
```

### Configuration Backup

```bash
# Backup Nginx configuration
cp /etc/nginx/sites-available/livemultimodalagent /root/backups/nginx-config-$(date +%Y%m%d).conf

# Backup systemd service
cp /etc/systemd/system/livemultimodalagent.service /root/backups/systemd-service-$(date +%Y%m%d)
```

### Automated Backups

```bash
# Create backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
tar -czvf $BACKUP_DIR/livemultimodalagent-$TIMESTAMP.tar.gz /root/LiveMultimodalAgent
cp /etc/nginx/sites-available/livemultimodalagent $BACKUP_DIR/nginx-config-$TIMESTAMP.conf
cp /etc/systemd/system/livemultimodalagent.service $BACKUP_DIR/systemd-service-$TIMESTAMP
# Rotate backups - keep last 7 days
find $BACKUP_DIR -type f -mtime +7 -name "livemultimodalagent-*.tar.gz" -delete
EOF

# Make script executable
chmod +x /root/backup.sh

# Set up daily cron job
echo "0 2 * * * /root/backup.sh" | crontab -
```

## Troubleshooting Common Issues

### Frontend Issues

1. **Frontend not loading**:
   - Check Nginx configuration: `nginx -t`
   - Verify file permissions: `ls -la /var/www/livemultimodalagent`
   - Check for 404 errors in Nginx logs

2. **CORS errors**:
   - Ensure backend has proper CORS headers
   - Verify frontend is making requests to the correct domain

### Backend Issues

1. **Backend service not running**:
   - Check service status: `systemctl status livemultimodalagent`
   - Look for Python errors: `journalctl -u livemultimodalagent`
   - Verify environment variables are set properly

2. **API endpoint failures**:
   - Check API keys in `.env` file
   - Verify rate limits haven't been exceeded
   - Look for specific error responses in logs

### Network Issues

1. **SSL certificate problems**:
   - Check certificate expiry: `certbot certificates`
   - Verify SSL configuration in Nginx
   - Run SSL test: `curl -vI https://Redacted`

2. **Connection timeouts**:
   - Check firewall settings: `ufw status`
   - Verify Nginx is listening on ports 80/443: `netstat -tlnp`
   - Check DNS resolution: `dig Redacted`

## Security Considerations

1. **API Key Protection**:
   - Restrict `.env` file permissions: `chmod 600 /root/LiveMultimodalAgent/.env`
   - Regularly rotate API keys
   - Monitor for unauthorized usage

2. **Server Hardening**:
   - Keep system updated: `apt update && apt upgrade -y`
   - Restrict SSH access: Configure key-based authentication only
   - Install and configure fail2ban to block brute force attempts

3. **Regular Audits**:
   - Check access logs for suspicious activity
   - Monitor CPU/memory usage for anomalies
   - Verify file integrity with checksums

## Contact and Support

For issues with the DigitalOcean deployment, contact the infrastructure team at your@email.com or via the internal ticket system.

## References

- [DigitalOcean Documentation](https://www.digitalocean.com/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Flask Deployment Options](https://flask.palletsprojects.com/en/2.3.x/deploying/)