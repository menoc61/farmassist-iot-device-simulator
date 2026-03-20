# FarmAssist - Windows Setup Guide

Complete step-by-step guide to set up FarmAssist IoT Simulation Platform on Windows.

---

## 📋 Prerequisites

### Required Software

1. **Node.js 18+** - Download from https://nodejs.org/
2. **PostgreSQL 15+** - Download from https://www.postgresql.org/download/windows/
3. **MQTT Broker (Mosquitto)** - Download from https://mosquitto.org/download/
4. **Node-RED** - Will be installed via npm

### Verify Installations

Open PowerShell or Command Prompt and run:

```powershell
# Check Node.js
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher

# Check PostgreSQL (after installation)
psql --version

# Check Mosquitto (after installation)
mosquitto -h
```

---

## 🗄️ Step 1: Setup PostgreSQL Database

### 1.1 Install PostgreSQL

1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run the installer with default settings
3. **Remember the password you set for postgres user!**
4. Keep the default port: `5432`

### 1.2 Create Database

Open **pgAdmin** (installed with PostgreSQL) or use psql:

```sql
-- Connect to PostgreSQL
-- Default: user=postgres, password=farmassist_dev

-- Create database
CREATE DATABASE farmassist;

-- Create user (optional, can use postgres)
CREATE USER farmassist WITH ENCRYPTED PASSWORD 'farmassist_dev';
GRANT ALL PRIVILEGES ON DATABASE farmassist TO farmassist;
```

### 1.3 Install TimescaleDB (Optional but Recommended)

1. Download TimescaleDB for Windows: https://docs.timescale.com/self-hosted/latest/install/installation-windows/
2. Follow the installation wizard
3. Enable in your database:

```sql
\c farmassist
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

---

## 📡 Step 2: Setup MQTT Broker (Mosquitto)

### 2.1 Install Mosquitto

1. Download from https://mosquitto.org/download/
2. Install with default settings
3. Add to PATH: `C:\Program Files\Mosquitto`

### 2.2 Configure Mosquitto

Edit `C:\Program Files\Mosquitto\mosquitto.conf`:

```conf
# Listener configuration
listener 1883
allow_anonymous true

# WebSocket listener (optional)
listener 9001
protocol websockets
allow_anonymous true

# Logging
log_dest file C:\Program Files\Mosquitto\log\mosquitto.log
log_type all

# Persistence
persistence true
persistence_location C:\Program Files\Mosquitto\data\
```

Create the log directory:
```powershell
mkdir "C:\Program Files\Mosquitto\log"
```

### 2.3 Start Mosquitto

**Option A: Run as Service (Recommended)**

```powershell
# Open PowerShell as Administrator
sc create mosquitto binPath= "C:\Program Files\Mosquitto\mosquitto.exe" start= auto
sc start mosquitto
```

**Option B: Run Manually**

```powershell
cd "C:\Program Files\Mosquitto"
mosquitto -c mosquitto.conf -v
```

### 2.4 Test MQTT

Open two PowerShell windows:

```powershell
# Window 1: Subscribe
mosquitto_sub -t "test/topic" -v

# Window 2: Publish
mosquitto_pub -t "test/topic" -m "Hello MQTT"
```

---

## 🔧 Step 3: Setup Backend

### 3.1 Navigate to Backend Folder

```powershell
cd C:\path\to\farmassist-win\backend
```

### 3.2 Install Dependencies

```powershell
npm install
```

### 3.3 Configure Environment

Edit `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (update with your PostgreSQL credentials)
DATABASE_URL=postgresql://postgres:farmassist_dev@localhost:5432/farmassist

# JWT Secret (generate a random string, minimum 32 characters)
JWT_SECRET=your-super-secret-key-change-this-in-production-32-chars

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
```

### 3.4 Setup Database Schema

```powershell
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

### 3.5 Start Backend

```powershell
# Development mode (auto-restart on changes)
npm run dev

# OR Production mode
npm start
```

You should see:
```
🌾 FarmAssist Backend running on port 3000
📊 Health: http://localhost:3000/health
🔌 WebSocket: ws://localhost:3000/ws
✅ Database connected
[MQTT] Connected to broker
```

---

## 🎛️ Step 4: Setup Node-RED Simulation

### 4.1 Install Node-RED

```powershell
# Install globally
npm install -g node-red

# Verify installation
node-red --version
```

### 4.2 Start Node-RED

```powershell
node-red
```

Node-RED will start on http://localhost:1880

### 4.3 Import FarmAssist Flows

1. Open http://localhost:1880 in your browser
2. Click the **Menu** (☰) → **Import** → **Clipboard**
3. Copy the content from `node-red-flows/farmassist-simulation.json`
4. Paste into the import dialog
5. Click **Import**
6. Click **Deploy**

### 4.4 Configure MQTT in Node-RED

The flow uses MQTT broker at `localhost:1883`. If your Mosquitto is running, it should connect automatically.

Check the MQTT node status - it should show "connected".

---

## 🌐 Step 5: Open Dashboard

Simply open `dashboard/index.html` in your browser:

```
file:///C:/path/to/farmassist-win/dashboard/index.html
```

Or serve it with any static server:

```powershell
# Using Python (if installed)
cd dashboard
python -m http.server 8080

# Then open http://localhost:8080
```

---

## 🚀 Quick Start Summary

Once everything is set up, here's your daily workflow:

### 1. Start PostgreSQL
```powershell
# If running as service (should auto-start)
sc query postgresql-x64-15

# Or start manually
net start postgresql-x64-15
```

### 2. Start Mosquitto
```powershell
# If running as service
sc start mosquitto

# Or manually
cd "C:\Program Files\Mosquitto"
mosquitto -c mosquitto.conf -v
```

### 3. Start Backend
```powershell
cd C:\path\to\farmassist-win\backend
npm run dev
```

### 4. Start Node-RED
```powershell
node-red
```

### 5. Open Dashboard
Open `dashboard/index.html` in your browser.

---

## 📁 Project Structure

```
farmassist-win/
├── backend/
│   ├── src/
│   │   └── index.js          # Main server
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── .env                  # Configuration
│   └── package.json
├── dashboard/
│   └── index.html            # Web dashboard
├── docs/
│   └── SETUP.md              # This file
└── node-red-flows/
    └── farmassist-simulation.json  # Simulation flows
```

---

## 🔍 Troubleshooting

### PostgreSQL Connection Failed

```powershell
# Check if PostgreSQL is running
sc query postgresql-x64-15

# Start it
net start postgresql-x64-15

# Test connection
psql -U postgres -d farmassist -c "SELECT 1"
```

### MQTT Connection Failed

```powershell
# Check if Mosquitto is running
tasklist | findstr mosquitto

# Check logs
type "C:\Program Files\Mosquitto\log\mosquitto.log"

# Test with mosquitto_sub/mosquitto_pub
```

### Backend Won't Start

```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Check database connection string in .env
# Ensure PostgreSQL is running
# Run: npx prisma db push
```

### Node-RED Won't Start

```powershell
# Check if port 1880 is in use
netstat -ano | findstr :1880

# Clear Node-RED data (WARNING: removes all flows)
rd /s /q %USERPROFILE%\.node-red
```

---

## 🌐 Access URLs

| Service | URL |
|---------|-----|
| Dashboard | `file:///C:/.../dashboard/index.html` or `http://localhost:8080` |
| Backend API | http://localhost:3000 |
| Backend Health | http://localhost:3000/health |
| WebSocket | ws://localhost:3000/ws |
| Node-RED | http://localhost:1880 |
| MQTT | mqtt://localhost:1883 |
| Prisma Studio | http://localhost:5555 (when running) |

---

## 📊 Default Login

- **Email**: admin@farmassist.io
- **Password**: admin123

*(Change this in production!)*

---

## 🔄 Data Flow

```
┌─────────────┐     MQTT      ┌─────────────┐     HTTP/WS     ┌─────────────┐
│  Node-RED   │ ────────────► │   Backend   │ ──────────────► │  Dashboard  │
│ Simulation  │  localhost:1883  localhost:3000                │   (Browser) │
└─────────────┘               └─────────────┘                  └─────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  PostgreSQL │
                              │  localhost  │
                              └─────────────┘
```

---

## 🛠️ Useful Commands

```powershell
# Restart all services
net stop mosquitto; net start mosquitto
net stop postgresql-x64-15; net start postgresql-x64-15

# View backend logs
cd backend
npm run dev

# Reset database (WARNING: deletes all data!)
npx prisma db push --force-reset

# Backup database
pg_dump -U postgres -d farmassist > backup.sql

# Restore database
psql -U postgres -d farmassist < backup.sql
```

---

## 📞 Support

If you encounter issues:

1. Check all services are running
2. Verify ports are not blocked by firewall
3. Check logs in each component
4. Ensure all environment variables are set correctly
