# Database Setup Guide

This directory contains the PostgreSQL database configuration for the multi-tenant icon library.

## Quick Start

### 1. Set up PostgreSQL Database

You have two options:

#### Option A: Cloud Database (Recommended for development)
Use a free PostgreSQL provider like:
- **Neon** (https://neon.tech) - Free tier with auto-scaling
- **Railway** (https://railway.app) - Free trial available
- **Render** (https://render.com) - Free tier available

After creating a database, copy the connection string (e.g., `postgresql://user:pass@host:5432/dbname`)

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL (macOS with Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb rhythm_icons

# Your connection string will be:
# postgresql://localhost:5432/rhythm_icons
```

### 2. Configure Environment

Update your `.env` file with the database URL:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 3. Run Migrations

Create the database tables:

```bash
npm run db:migrate
```

This will create:
- `tenants` - Organizations using the icon library
- `icons` - Icon library with multi-tenant support
- `users` - Links Azure AD users to tenants

### 4. Seed Initial Data

Populate the database with sample icons:

```bash
npm run db:seed
```

This will create:
- A default organization
- ~30 sample icons (arrows, UI elements, business icons, etc.)

### 5. Verify Setup

Start the server and check the logs:

```bash
npm run server
```

You should see:
```
[Database] Connected to PostgreSQL
[Database] Connection test successful: [timestamp]
[Server] Running on port 3001
```

## Database Scripts

```bash
npm run db:migrate   # Run all pending migrations
npm run db:rollback  # Rollback last migration
npm run db:seed      # Run seed files
npm run db:reset     # Rollback, migrate, and seed (fresh start)
```

## Multi-Tenant Architecture

### How it works:

1. **Tenants Table**: Each organization has a unique tenant record
2. **Icons Table**: Icons belong to a tenant OR can be public (shared)
3. **Users Table**: Azure AD users are mapped to tenants

### API Behavior:

When a user makes a request to `/api/icons`:
1. Server validates Azure AD JWT
2. Extracts Azure tenant ID from token (`req.user.tid`)
3. Looks up corresponding tenant in database
4. Returns icons where:
   - `tenant_id` matches user's tenant, OR
   - `is_public = true` (shared across all tenants)

### Adding Icons:

Icons can be added via:
1. **API**: `POST /api/icons` (requires authentication)
2. **Database**: Insert directly into `icons` table
3. **Seeds**: Add to `db/seeds/002_icons.js`

## Database Schema

### Tenants
```sql
id                UUID PRIMARY KEY
name              VARCHAR (organization name)
azure_tenant_id   VARCHAR UNIQUE (maps to Azure AD tenant)
description       TEXT
is_active         BOOLEAN
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Icons
```sql
id                UUID PRIMARY KEY
tenant_id         UUID (FK to tenants) - organization that owns this icon
icon_id           VARCHAR (e.g., "heart-rate", "stethoscope")
name              VARCHAR (display name)
category          VARCHAR (used for filtering/tabs)
svg               TEXT (inline SVG markup)
is_public         BOOLEAN (if true, visible to all tenants)
created_at        TIMESTAMP
updated_at        TIMESTAMP

UNIQUE (tenant_id, icon_id)  -- Same icon_id allowed across different tenants
```

### Users
```sql
id                UUID PRIMARY KEY
tenant_id         UUID (FK to tenants)
azure_user_id     VARCHAR UNIQUE (Azure AD Object ID)
email             VARCHAR
name              VARCHAR
role              VARCHAR (admin, user, viewer)
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

## Troubleshooting

### Connection Errors

If you see `Connection test failed`:
1. Verify `DATABASE_URL` in `.env` is correct
2. Check database is running and accessible
3. Verify firewall/network settings
4. For cloud databases, check if IP is whitelisted

### Migration Errors

If migrations fail:
1. Check PostgreSQL version (requires 12+)
2. Verify user has CREATE TABLE permissions
3. Run `npm run db:rollback` and try again

### Seed Errors

If seeds fail:
1. Ensure migrations ran successfully first
2. Check for duplicate data (run `npm run db:reset`)
3. Verify UUID extension is available

## Production Deployment

1. Use a production PostgreSQL database (not local)
2. Enable SSL connections (already configured in `connection.js`)
3. Set `NODE_ENV=production` in environment variables
4. Use connection pooling (already configured)
5. Set up automated backups
6. Consider read replicas for high traffic

## Migration Management

### Creating New Migrations

```bash
npx knex migrate:make migration_name --knexfile db/knexfile.js
```

This creates a new file in `db/migrations/` with timestamp prefix.

### Migration Best Practices

1. Never edit existing migrations that have run in production
2. Always provide both `up` and `down` functions
3. Use transactions for complex migrations
4. Test rollbacks before deploying
