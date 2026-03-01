# Production Deployment Guide

## Overview

This guide covers deploying the booking platform to production with Stripe integration, scheduled payments, and full admin management.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+ (for caching and sessions)
- Stripe account with API keys
- Domain name with SSL certificate
- Docker & Docker Compose

## Environment Configuration

### 1. Stripe Setup

1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: 
   - Test keys: Already provided in `.env.example`
   - Live keys: Get from Stripe Dashboard → Developers → API keys

3. **Configure Webhooks**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.succeeded`, `charge.failed`
   - Copy webhook signing secret

### 2. Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/booking_platform"

# Server
NODE_ENV="production"
PORT=8080
API_URL="https://yourdomain.com"
FRONTEND_URL="https://yourdomain.com"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRY="7d"
JWT_REFRESH_EXPIRY="30d"

# Stripe (REPLACE WITH LIVE KEYS FOR PRODUCTION)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Booking Configuration
DEPOSIT_PERCENTAGE=25
BALANCE_CHARGE_THRESHOLD_DAYS=30
CURRENCY=USD

# Payment Processing
ENABLE_PAYMENT_PROCESSING=true
PAYMENT_RETRY_ATTEMPTS=3
PAYMENT_RETRY_DELAY_HOURS=24

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL="info"
```

## Database Setup

### 1. PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb booking_platform
sudo -u postgres createuser --interactive
```

### 2. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with initial data
npx prisma db seed
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Clone and Build**:
```bash
git clone <repository>
cd booking
cp .env.example .env
# Edit .env with your values
```

2. **Deploy with Docker Compose**:
```bash
docker-compose up -d
```

3. **Initialize Database**:
```bash
docker-compose exec app npx prisma db push
```

### Option 2: Manual Deployment

1. **Install Dependencies**:
```bash
pnpm install
```

2. **Build Application**:
```bash
pnpm build
```

3. **Setup Process Manager** (PM2):
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## Cron Job Setup

The application includes an internal scheduler using node-cron, but for production reliability, set up a system cron job:

### 1. Balance Payment Processing

Add to crontab (`crontab -e`):

```bash
# Run every hour to process scheduled payments
0 * * * * cd /path/to/your/app && node scripts/process-scheduled-payments.js

# Run daily at 2 AM for reports
0 2 * * * cd /path/to/your/app && node scripts/daily-report.js
```

### 2. Create Scripts

`scripts/process-scheduled-payments.js`:
```javascript
require('../dist/server/services/scheduler').PaymentScheduler.processScheduledBalancePayments();
```

`scripts/daily-report.js`:
```javascript
require('../dist/server/services/scheduler').PaymentScheduler.generateDailyReport();
```

## SSL Certificate Setup

### 1. Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8080;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/payments/webhook {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            # Important for Stripe webhooks
            proxy_request_buffering off;
        }
    }
}
```

## Monitoring and Logging

### 1. Application Logs

```bash
# Docker logs
docker-compose logs -f app

# PM2 logs
pm2 logs
```

### 2. Database Monitoring

```bash
# Connect to database
docker-compose exec db psql -U postgres -d booking_platform

# Monitor connections
SELECT * FROM pg_stat_activity;
```

### 3. Health Checks

- Application health: `GET /api/ping`
- Database health: Check connection logs
- Stripe health: Monitor webhook processing

## Testing the Deployment

### 1. Stripe Test Mode

1. Use test keys initially
2. Test with Stripe test cards:
   - Success: `4242424242424242`
   - Declined: `4000000000000002`
   - Insufficient funds: `4000000000009995`

### 2. Payment Flow Testing

1. **Test Deposit Payment** (booking > 30 days):
   - Create booking 35+ days ahead
   - Verify 25% charge
   - Check scheduled balance payment

2. **Test Full Payment** (booking < 30 days):
   - Create booking 15 days ahead
   - Verify 100% charge
   - Verify non-refundable status

3. **Test Failure Scenarios**:
   - Declined card payments
   - Webhook failures
   - Retry logic

### 3. Admin Panel Testing

1. Access `/admin` dashboard
2. Verify all statistics
3. Test manual balance charge trigger
4. Test refund issuance

## Switching from Test to Live Mode

### 1. Update Stripe Keys

```bash
# In .env
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

### 2. Update Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Update endpoint URL to production domain
3. Test webhook connectivity
4. Update webhook secret in `.env`

### 3. Restart Application

```bash
# Docker
docker-compose restart app

# PM2
pm2 restart all
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **Database Security**: Use strong passwords, restrict access
3. **API Security**: Enable rate limiting, validate inputs
4. **SSL**: Always use HTTPS in production
5. **Stripe Security**: Use webhook signature verification

## Backup Strategy

### 1. Database Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres booking_platform > backup_$DATE.sql
```

### 2. File Backups

- Back up uploaded files and SSL certificates
- Store backups offsite (AWS S3, etc.)

## Performance Optimization

1. **Database**: Add indexes for frequently queried fields
2. **Caching**: Use Redis for session storage and caching
3. **CDN**: Use CloudFlare for static assets
4. **Load Balancing**: Multiple app instances behind load balancer

## Troubleshooting

### Common Issues

1. **Payment Failures**:
   - Check Stripe logs
   - Verify webhook configuration
   - Check API key permissions

2. **Scheduled Payments Not Working**:
   - Verify cron job setup
   - Check application logs
   - Verify database connectivity

3. **Admin Panel Not Loading**:
   - Check user permissions
   - Verify authentication middleware
   - Check database connection

### Log Locations

- Application logs: `/var/log/booking/`
- Nginx logs: `/var/log/nginx/`
- Database logs: PostgreSQL log directory
- Docker logs: `docker-compose logs`

## Support

For issues related to:
- **Stripe**: Stripe Support Dashboard
- **Application**: Check logs and GitHub issues
- **Infrastructure**: Consult your hosting provider

---

**Important**: Always test thoroughly in a staging environment before deploying to production.
