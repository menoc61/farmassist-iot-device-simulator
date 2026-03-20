import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // -----------------------------
  // 1. Create Admin User
  // -----------------------------
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@farmassist.io" },
    update: {},
    create: {
      userId: "USER_ADMIN_001",
      email: "admin@farmassist.io",
      passwordHash: hashedPassword,
      name: "Admin",
      role: "admin",
    },
  });

  console.log("✅ Admin user created");

  // -----------------------------
  // 2. Farms
  // -----------------------------
  const farmsData = [
    {
      farmId: "FARM_BERTOUA_001",
      name: "Bertoua Farm",
      location: "Bertoua",
      farmType: "horizontal",
      crop: "Maize",
    },
    {
      farmId: "FARM_MAROUA_001",
      name: "Maroua Farm",
      location: "Maroua",
      farmType: "horizontal",
      crop: "Millet",
    },
    {
      farmId: "FARM_BAFANG_001",
      name: "Bafang Farm",
      location: "Bafang",
      farmType: "horizontal",
      crop: "Vegetables",
    },
    {
      farmId: "FARM_HYDRO_001",
      name: "Hydroponics Farm",
      location: "Indoor",
      farmType: "vertical",
      crop: "Lettuce",
    },
  ];

  const farms = [];

  for (const farm of farmsData) {
    const createdFarm = await prisma.farm.upsert({
      where: { farmId: farm.farmId },
      update: {},
      create: {
        ...farm,
        userId: admin.userId,
      },
    });

    farms.push(createdFarm);
  }

  console.log("✅ Farms created");

  // -----------------------------
  // 3. Devices
  // -----------------------------
  const devicesData = [
    {
      deviceId: "DEV_BERTOUA_001",
      name: "Bertoua Sensor",
      farmId: "FARM_BERTOUA_001",
      deviceType: "horizontal_sensor",
      zone: "Zone A",
      status: "online",
    },
    {
      deviceId: "DEV_MAROUA_001",
      name: "Maroua Sensor",
      farmId: "FARM_MAROUA_001",
      deviceType: "horizontal_sensor",
      zone: "Zone B",
      status: "online",
    },
    {
      deviceId: "DEV_BAFANG_001",
      name: "Bafang Sensor",
      farmId: "FARM_BAFANG_001",
      deviceType: "horizontal_sensor",
      zone: "Zone C",
      status: "online",
    },
    {
      deviceId: "DEV_HYDRO_001",
      name: "Hydroponics Controller",
      farmId: "FARM_HYDRO_001",
      deviceType: "vertical_sensor",
      zone: "Rack 1",
      status: "online",
    },
  ];

  for (const device of devicesData) {
    await prisma.device.upsert({
      where: { deviceId: device.deviceId },
      update: {
        status: device.status,
        lastSeenAt: new Date(),
      },
      create: {
        ...device,
        lastSeenAt: new Date(),
      },
    });
  }

  console.log("✅ Devices created");

  // -----------------------------
  // 4. Sample Telemetry
  // -----------------------------
  await prisma.telemetry.createMany({
    data: [
      {
        deviceId: "DEV_BERTOUA_001",
        tempAir: 30,
        humidity: 70,
        lightLux: 12000,
        tempSoil: 26,
        moisture1: 40,
        soilPh: 6.5,
        batteryPct: 90,
      },
      {
        deviceId: "DEV_MAROUA_001",
        tempAir: 38,
        humidity: 30,
        moisture1: 15, // anomaly (dry soil)
        soilPh: 7.2,
        batteryPct: 60,
      },
      {
        deviceId: "DEV_HYDRO_001",
        waterTemp: 22,
        ecSolution: 1.8,
        phSolution: 5.8,
        waterLevelPct: 80,
        pump: true,
      },
    ],
  });

  console.log("✅ Telemetry seeded");

  // -----------------------------
  // 5. Alerts (based on anomalies)
  // -----------------------------
  await prisma.alert.createMany({
    data: [
      {
        alertId: "ALERT_001",
        deviceId: "DEV_MAROUA_001",
        alertType: "soil_moisture_low",
        severity: "critical",
        message: "Soil moisture critically low",
        sensorValue: 15,
        threshold: 20,
      },
    ],
  });

  console.log("✅ Alerts created");

  // -----------------------------
  // 6. Commands
  // -----------------------------
  await prisma.command.createMany({
    data: [
      {
        cmdId: "CMD_001",
        deviceId: "DEV_MAROUA_001",
        command: "irrigation_on",
        params: { duration: 600 },
        status: "pending",
      },
    ],
  });

  console.log("✅ Commands created");

  console.log("🌱 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
