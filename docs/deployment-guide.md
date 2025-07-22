# Deployment Guide

## Überblick

Dieser Guide beschreibt die Build- und Deployment-Prozesse für das Stromhaltig-Projekt. Er umfasst lokale Builds, Staging-, und Production-Deployments sowie Monitoring und Wartung.

## Build-Prozess

### 1. Development Build

```bash
# Development Server (mit Hot-Reload)
npm run dev

# Einzelne Services
npm run server:dev    # Backend Development
npm run client:dev    # Frontend Development
```

### 2. Production Build

```bash
# Complete Production Build
npm run build

# Schritt-für-Schritt:
npm run build:client  # React → Static Files
tsc                   # TypeScript → JavaScript
```

### 3. Build-Verification

```bash
# Build testen
npm run start         # Production Server starten
curl http://localhost:3001/api/health

# Frontend testen
npx serve client/build -p 3000
```

## Environment-Konfiguration

### 1. Environment-Dateien

```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

### 2. Production Environment Variables

```env
# Environment
NODE_ENV=production

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://prod_user:secure_password@db-server:5432/stromhaltig_prod
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000

# Security
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# File Upload
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=100MB

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=10

# AI Services
GEMINI_API_KEY=your_production_gemini_key
OPENAI_API_KEY=your_production_openai_key

# External Services
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@stromhaltig.de
SMTP_PASS=your_smtp_password

# Monitoring
SENTRY_DSN=your_sentry_dsn
HEALTH_CHECK_TOKEN=your_health_check_token

# Performance
REDIS_URL=redis://redis-server:6379
ENABLE_COMPRESSION=true
ENABLE_CACHE=true
```

## Database-Deployment

### 1. Migration-Strategy

```bash
# Pre-Deployment: Backup erstellen
pg_dump -h prod-db -U prod_user -d stromhaltig_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Migrations ausführen
psql -h prod-db -U prod_user -d stromhaltig_prod -f migrations/001_initial_schema.sql
psql -h prod-db -U prod_user -d stromhaltig_prod -f migrations/002_quiz_system.sql
psql -h prod-db -U prod_user -d stromhaltig_prod -f migrations/003_enhanced_logging.sql

# Migration-Verification
psql -h prod-db -U prod_user -d stromhaltig_prod -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### 2. Rollback-Procedure

```bash
# Rollback-Scripts bereithalten
mkdir -p rollback
echo "DROP TABLE IF EXISTS new_table;" > rollback/rollback_003.sql

# Bei Problemen: Rollback ausführen
psql -h prod-db -U prod_user -d stromhaltig_prod -f rollback/rollback_003.sql

# Database aus Backup wiederherstellen (Notfall)
psql -h prod-db -U prod_user -d stromhaltig_prod < backup_20240101_120000.sql
```

## Docker-Deployment

### 1. Dockerfile

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production
RUN cd client && npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Create directories
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### 2. Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/stromhaltig
      - REDIS_URL=redis://redis:6379
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    depends_on:
      - db
      - redis
    restart: unless-stopped
    
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: stromhaltig
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./client/build:/usr/share/nginx/html
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:
```

### 3. Nginx-Konfiguration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server app:3001;
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name stromhaltig.de www.stromhaltig.de;
        
        # Redirect to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name stromhaltig.de www.stromhaltig.de;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # Gzip Compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Frontend
        location / {
            root /usr/share/nginx/html;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Login Rate Limiting
        location /api/auth/login {
            limit_req zone=login burst=3 nodelay;
            proxy_pass http://backend;
            # ... same proxy settings as above
        }

        # File Uploads
        location /api/documents/upload {
            client_max_body_size 100M;
            proxy_pass http://backend;
            # ... same proxy settings as above
        }

        # Health Check
        location /health {
            access_log off;
            proxy_pass http://backend/api/health;
        }
    }
}
```

## Cloud-Deployment

### 1. AWS Deployment

#### ECS Fargate

```yaml
# aws-task-definition.json
{
  "family": "stromhaltig",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "stromhaltig-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/stromhaltig:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:stromhaltig/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:stromhaltig/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/stromhaltig",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### RDS Database Setup

```bash
# RDS Instance erstellen
aws rds create-db-instance \
  --db-instance-identifier stromhaltig-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username stromhaltig \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

### 2. Digital Ocean Deployment

#### App Platform

```yaml
# .do/app.yaml
name: stromhaltig
services:
- name: api
  source_dir: /
  github:
    repo: stromdao/stromhaltig
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_count: 2
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    type: SECRET
  - key: JWT_SECRET
    type: SECRET
  health_check:
    http_path: /api/health
  routes:
  - path: /api
    preserve_path_prefix: true

- name: frontend
  source_dir: /client
  build_command: npm run build
  environment_slug: node-js
  routes:
  - path: /
    preserve_path_prefix: false

databases:
- name: stromhaltig-db
  engine: PG
  version: "15"
  size: basic-xs
  num_nodes: 1
```

### 3. Railway Deployment

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[env]
NODE_ENV = "production"
PORT = "3001"
```

## CI/CD Pipeline

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: stromhaltig_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci && cd client && npm ci
        
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stromhaltig_test
          
      - name: Build application
        run: npm run build

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy to Production
        run: |
          # Deployment-Script hier
          echo "Deploying to production..."
          
      - name: Run Database Migrations
        run: |
          # Migration-Script hier
          echo "Running migrations..."
          
      - name: Health Check
        run: |
          sleep 30
          curl -f https://stromhaltig.de/api/health || exit 1
          
      - name: Notify Deployment
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "Deployment ${{ job.status }}: stromhaltig.de"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Deployment-Script

```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
CONTAINER_NAME="stromhaltig-app"
IMAGE_NAME="ghcr.io/stromdao/stromhaltig:latest"
BACKUP_DIR="/backups"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Starting deployment..."

# 1. Create backup
echo "📦 Creating database backup..."
docker exec stromhaltig-db pg_dump -U postgres stromhaltig > "$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

# 2. Pull latest image
echo "📥 Pulling latest image..."
docker pull $IMAGE_NAME

# 3. Run database migrations
echo "🗃️ Running database migrations..."
docker run --rm --network stromhaltig_default \
  -e DATABASE_URL="$DATABASE_URL" \
  $IMAGE_NAME npm run migrate

# 4. Deploy new version
echo "🔄 Deploying new version..."
docker-compose -f $COMPOSE_FILE up -d --no-deps app

# 5. Health check
echo "🏥 Running health check..."
sleep 30
for i in {1..10}; do
  if curl -f http://localhost:3001/api/health; then
    echo "✅ Health check passed"
    break
  fi
  echo "⏳ Waiting for service to be ready... ($i/10)"
  sleep 10
done

# 6. Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment completed successfully!"
```

## Monitoring & Observability

### 1. Health Checks

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { DatabaseHelper } from '../utils/database';
import { getLogger } from '../core/logging/logger';

const router = Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  try {
    // Database check
    await DatabaseHelper.executeQuery('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'error';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = memPercent > 90 ? 'warning' : 'ok';

  res.status(health.status === 'ok' ? 200 : 500).json(health);
});

export { router as healthRoutes };
```

### 2. Application Metrics

```typescript
// src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../core/logging/logger';

const logger = getLogger().setContext('Metrics');

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Custom metrics
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration
      });
    }
  });

  next();
};
```

### 3. Error Tracking

```bash
# Sentry Setup
npm install @sentry/node @sentry/tracing
```

```typescript
// src/monitoring/sentry.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

export function initSentry(app: any) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app })
    ],
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}
```

## Backup & Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="your-db-host"
DB_NAME="stromhaltig"
DB_USER="postgres"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/stromhaltig_$DATE.sql.gz"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/stromhaltig_$DATE.sql.gz" "s3://your-backup-bucket/database/"

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "stromhaltig_*.sql.gz" -mtime +30 -delete

echo "Backup completed: stromhaltig_$DATE.sql.gz"
```

### 2. File Backup

```bash
#!/bin/bash
# backup-files.sh

UPLOAD_DIR="/app/uploads"
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

# Create compressed archive
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$UPLOAD_DIR" .

# Upload to S3
aws s3 cp "$BACKUP_DIR/uploads_$DATE.tar.gz" "s3://your-backup-bucket/files/"

# Cleanup
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

### 3. Recovery Procedures

```bash
# Database Recovery
gunzip -c stromhaltig_20240101_120000.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# File Recovery
tar -xzf uploads_20240101_120000.tar.gz -C /app/uploads/

# Application Recovery
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## Security

### 1. SSL/TLS Setup

```bash
# Let's Encrypt mit Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d stromhaltig.de -d www.stromhaltig.de

# SSL-Renewal (Cronjob)
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration

```bash
# UFW Setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Application-specific rules
sudo ufw allow from 10.0.0.0/8 to any port 5432  # Database access
sudo ufw allow from 10.0.0.0/8 to any port 6379  # Redis access
```

### 3. Secrets Management

```bash
# Docker Secrets
echo "super_secret_jwt_key" | docker secret create jwt_secret -
echo "database_password" | docker secret create db_password -

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name "stromhaltig/database-url" \
  --description "Database connection string" \
  --secret-string "postgresql://user:pass@host:5432/db"
```

## Maintenance

### 1. Log Rotation

```bash
# Logrotate configuration
sudo tee /etc/logrotate.d/stromhaltig << EOF
/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 app app
    postrotate
        docker kill -s USR1 stromhaltig-app
    endscript
}
EOF
```

### 2. Database Maintenance

```sql
-- Weekly maintenance script
-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Update table statistics
ANALYZE;

-- Reindex if needed
REINDEX DATABASE stromhaltig;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Performance Monitoring

```bash
# System monitoring script
#!/bin/bash
# monitor.sh

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')

# Memory Usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')

# Disk Usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

# Database Connections
DB_CONNECTIONS=$(psql -h localhost -U postgres -d stromhaltig -t -c "SELECT count(*) FROM pg_stat_activity;")

echo "$(date): CPU: ${CPU_USAGE}%, Memory: ${MEM_USAGE}%, Disk: ${DISK_USAGE}%, DB Connections: ${DB_CONNECTIONS}"

# Alert if thresholds exceeded
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    echo "ALERT: High memory usage: ${MEM_USAGE}%"
fi
```

## Troubleshooting

### 1. Common Issues

```bash
# Container won't start
docker logs stromhaltig-app --tail 50

# Database connection issues
docker exec stromhaltig-db pg_isready -U postgres

# High memory usage
docker stats stromhaltig-app

# Check application logs
tail -f /app/logs/app.log | grep ERROR
```

### 2. Performance Issues

```sql
-- Slow query analysis
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
ORDER BY idx_scan ASC;
```

### 3. Rollback Procedures

```bash
# Rollback to previous version
docker tag stromhaltig:current stromhaltig:backup
docker pull stromhaltig:previous
docker tag stromhaltig:previous stromhaltig:current
docker-compose up -d --no-deps app

# Database rollback
psql -h localhost -U postgres -d stromhaltig < backup_before_deployment.sql
```

Dieser Deployment-Guide bietet eine umfassende Anleitung für sichere, skalierbare und wartbare Produktions-Deployments.
