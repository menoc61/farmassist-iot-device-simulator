/**
 * FarmAssist Backend - Main Server
 * Express + WebSocket + MQTT Integration
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import mqtt from 'mqtt';
import { PrismaClient } from '@prisma/client';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { createServer } from 'http';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'sq8CPRik5X0Q67AzLSsMd+WoS2szD1T1HcmNZNPOzmw=');

// State
const clients = new Map();
let mqttClient = null;
let messageCount = 0;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token');
    
    const { payload } = await jwtVerify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
};

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
  res.json({
    name: 'FarmAssist Backend',
    version: '1.0.0',
    status: 'running',
    mqtt: mqttClient?.connected ? 'connected' : 'disconnected',
    websocketClients: clients.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected', mqtt: mqttClient?.connected });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string()
    });
    
    const { email, password, name } = schema.parse(req.body);
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, error: 'Email already exists' });
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { userId: `usr_${Date.now()}`, email, passwordHash, name }
    });
    
    const token = await new SignJWT({ sub: user.userId, email, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    res.json({ success: true, data: { user: { userId: user.userId, email, name }, token } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = await new SignJWT({ sub: user.userId, email, role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);
    
    res.json({ success: true, data: { user: { userId: user.userId, email, name: user.name }, token } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==================== FARM ROUTES ====================
app.get('/api/farms', authMiddleware, async (req, res) => {
  try {
    const farms = await prisma.farm.findMany({
      where: { userId: req.user.sub },
      include: {
        devices: {
          select: { deviceId: true, name: true, status: true, _count: { select: { alerts: { where: { status: 'active' } } } } }
        }
      }
    });
    res.json({ success: true, data: farms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/farms', authMiddleware, async (req, res) => {
  try {
    const { name, farmType, crop, location } = req.body;
    const farm = await prisma.farm.create({
      data: {
        farmId: `farm_${Date.now()}`,
        name,
        farmType,
        crop,
        location,
        userId: req.user.sub
      }
    });
    res.json({ success: true, data: farm });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DEVICE ROUTES ====================
app.get('/api/devices', authMiddleware, async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { farm: { userId: req.user.sub } },
      include: {
        telemetry: { orderBy: { time: 'desc' }, take: 1 },
        _count: { select: { alerts: { where: { status: 'active' } } } }
      }
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/devices', authMiddleware, async (req, res) => {
  try {
    const { farmId, name, deviceType, zone } = req.body;
    const device = await prisma.device.create({
      data: {
        deviceId: `dev_${Date.now()}`,
        name,
        deviceType,
        zone,
        farmId
      }
    });
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== TELEMETRY ROUTES ====================
app.get('/api/telemetry/latest', authMiddleware, async (req, res) => {
  try {
    const telemetry = await prisma.telemetry.findMany({
      where: { device: { farm: { userId: req.user.sub } } },
      orderBy: { time: 'desc' },
      take: 100,
      include: { device: { select: { name: true, deviceType: true, farmId: true } } }
    });
    res.json({ success: true, data: telemetry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/telemetry/history/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const telemetry = await prisma.telemetry.findMany({
      where: {
        deviceId: req.params.deviceId,
        time: { gte: since }
      },
      orderBy: { time: 'asc' }
    });
    
    res.json({ success: true, data: telemetry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ALERT ROUTES ====================
app.get('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { device: { farm: { userId: req.user.sub } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { device: { select: { name: true, farmId: true } } }
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/alerts/active', authMiddleware, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        device: { farm: { userId: req.user.sub } },
        status: 'active'
      },
      include: { device: { select: { name: true } } }
    });
    
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length
    };
    
    res.json({ success: true, data: { alerts, summary } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/alerts/:alertId/acknowledge', authMiddleware, async (req, res) => {
  try {
    const alert = await prisma.alert.update({
      where: { alertId: req.params.alertId },
      data: { status: 'acknowledged' }
    });
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STATS ROUTES ====================
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const [deviceCount, farmCount, telemetryCount, activeAlerts] = await Promise.all([
      prisma.device.count({ where: { farm: { userId: req.user.sub } } }),
      prisma.farm.count({ where: { userId: req.user.sub } }),
      prisma.telemetry.count({ where: { device: { farm: { userId: req.user.sub } } } }),
      prisma.alert.count({ where: { device: { farm: { userId: req.user.sub } }, status: 'active' } })
    ]);
    
    res.json({
      success: true,
      data: {
        devices: deviceCount,
        farms: farmCount,
        telemetry: telemetryCount,
        activeAlerts,
        mqttConnected: mqttClient?.connected || false,
        wsClients: clients.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== WEBSOCKET ====================
wss.on('connection', (ws, req) => {
  const clientId = `ws_${Date.now()}`;
  clients.set(clientId, { ws, subscriptions: { farms: [], devices: [] } });
  
  console.log(`[WS] Client connected: ${clientId}`);
  
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { clientId, message: 'Connected to FarmAssist' },
    timestamp: Date.now()
  }));
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const client = clients.get(clientId);
      
      if (msg.action === 'subscribe_farm') {
        client.subscriptions.farms.push(msg.farmId);
      } else if (msg.action === 'subscribe_device') {
        client.subscriptions.devices.push(msg.deviceId);
      } else if (msg.action === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('[WS] Message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId}`);
  });
});

function broadcast(message, filter = null) {
  const data = JSON.stringify(message);
  clients.forEach((client, id) => {
    if (filter && !filter(client)) return;
    if (client.ws.readyState === 1) {
      client.ws.send(data);
    }
  });
}

// ==================== MQTT ====================
function connectMQTT() {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  
  mqttClient = mqtt.connect(brokerUrl, {
    clientId: `farmassist-backend-${Date.now()}`,
    reconnectPeriod: 5000
  });
  
  mqttClient.on('connect', () => {
    console.log('[MQTT] Connected to broker');
    mqttClient.subscribe([
      'farmassist/+/+/+/telemetry',
      'farmassist/+/+/+/status',
      'farmassist/alerts'
    ]);
  });
  
  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      messageCount++;
      
      if (topic.includes('telemetry')) {
        await handleTelemetry(payload);
      }
    } catch (error) {
      console.error('[MQTT] Error:', error);
    }
  });
  
  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
  });
}

async function handleTelemetry(payload) {
  try {
    // Ensure device exists
    await prisma.device.upsert({
      where: { deviceId: payload.device_id },
      update: { lastSeenAt: new Date(), status: 'online' },
      create: {
        deviceId: payload.device_id,
        name: payload.device_id,
        farmId: payload.farm_id,
        deviceType: payload.device_type,
        zone: payload.zone,
        status: 'online'
      }
    });
    
    // Store telemetry
    const telemetry = await prisma.telemetry.create({
      data: {
        deviceId: payload.device_id,
        tempAir: payload.sensors?.temp_air,
        humidity: payload.sensors?.humidity,
        lightLux: payload.sensors?.light_lux,
        tempSoil: payload.sensors?.temp_soil,
        moisture1: payload.sensors?.moisture_1,
        moisture2: payload.sensors?.moisture_2,
        soilPh: payload.sensors?.soil_ph,
        salinity: payload.sensors?.salinity,
        flowLph: payload.sensors?.flow_lph,
        waterTemp: payload.sensors?.water_temp,
        ecSolution: payload.sensors?.ec_solution,
        phSolution: payload.sensors?.ph_solution,
        doMgl: payload.sensors?.do_mgl,
        waterLevelPct: payload.sensors?.water_level_pct,
        irrigation: payload.actuators?.irrigation,
        pump: payload.actuators?.pump,
        ventilation: payload.actuators?.ventilation,
        growLight: payload.actuators?.grow_light,
        batteryPct: payload.meta?.battery_pct,
        wifiRssi: payload.meta?.wifi_rssi
      }
    });
    
    // Check thresholds and create alerts
    const alerts = checkThresholds(payload);
    for (const alert of alerts) {
      await prisma.alert.create({
        data: {
          alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          deviceId: payload.device_id,
          alertType: alert.type,
          severity: alert.severity,
          message: alert.message,
          sensorValue: alert.value,
          threshold: alert.threshold
        }
      });
    }
    
    // Broadcast to WebSocket clients
    broadcast({
      type: 'telemetry',
      payload: { ...payload, dbId: telemetry.id, alerts },
      timestamp: Date.now()
    });
    
    // Send toast for critical alerts
    if (alerts.length > 0) {
      broadcast({
        type: 'toast',
        payload: {
          id: `toast_${Date.now()}`,
          type: alerts[0].severity === 'critical' ? 'error' : 'warning',
          title: `${alerts[0].type} Alert`,
          message: alerts[0].message,
          deviceId: payload.device_id,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('[Telemetry] Error:', error);
  }
}

function checkThresholds(payload) {
  const alerts = [];
  const sensors = payload.sensors || {};
  const isVertical = payload.device_type === 'vertical';
  
  if (isVertical) {
    // Vertical farm thresholds
    if (sensors.ec_solution !== null && sensors.ec_solution < 0.8) {
      alerts.push({ type: 'EC_LOW', severity: 'warning', message: `EC too low: ${sensors.ec_solution}`, value: sensors.ec_solution, threshold: 0.8 });
    }
    if (sensors.ph_solution !== null && (sensors.ph_solution < 5.0 || sensors.ph_solution > 7.5)) {
      alerts.push({ type: 'PH_CRITICAL', severity: 'critical', message: `pH out of range: ${sensors.ph_solution}`, value: sensors.ph_solution, threshold: sensors.ph_solution < 5.0 ? 5.0 : 7.5 });
    }
    if (sensors.do_mgl !== null && sensors.do_mgl < 4.0) {
      alerts.push({ type: 'DO_CRITICAL', severity: 'critical', message: `Dissolved oxygen low: ${sensors.do_mgl} mg/L`, value: sensors.do_mgl, threshold: 4.0 });
    }
    if (sensors.water_level_pct !== null && sensors.water_level_pct < 15) {
      alerts.push({ type: 'RESERVOIR_CRITICAL', severity: 'critical', message: `Water level critical: ${sensors.water_level_pct}%`, value: sensors.water_level_pct, threshold: 15 });
    }
  } else {
    // Horizontal farm thresholds
    if (sensors.salinity !== null && sensors.salinity > 4.0) {
      alerts.push({ type: 'SALINITY_CRITICAL', severity: 'critical', message: `Salinity too high: ${sensors.salinity}`, value: sensors.salinity, threshold: 4.0 });
    }
    if (sensors.soil_ph !== null && (sensors.soil_ph < 4.5 || sensors.soil_ph > 8.5)) {
      alerts.push({ type: 'PH_CRITICAL', severity: 'critical', message: `Soil pH out of range: ${sensors.soil_ph}`, value: sensors.soil_ph, threshold: sensors.soil_ph < 4.5 ? 4.5 : 8.5 });
    }
    if (sensors.moisture_1 !== null && sensors.moisture_1 < 15) {
      alerts.push({ type: 'MOISTURE_CRITICAL', severity: 'critical', message: `Soil moisture critical: ${sensors.moisture_1}%`, value: sensors.moisture_1, threshold: 15 });
    }
  }
  
  return alerts;
}

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  console.log(`\n🌾 FarmAssist Backend running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  console.log('');
  
  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Connect to MQTT
  connectMQTT();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  mqttClient?.end();
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});
