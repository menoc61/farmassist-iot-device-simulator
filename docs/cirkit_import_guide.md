# CirkitDesigner Import Guide for FarmAssist+ IoT Kits

## Quick Start Instructions

### Step 1: Access CirkitDesigner
1. Navigate to: https://app.cirkitdesigner.com/
2. Create account or log in
3. Click "New Project" or "Import Circuit"

### Step 2: Import Circuit Files

You have **TWO circuit designs** ready:

#### Option A: Horizontal Farm Kit (Traditional Farms)
**File:** `farmassist_horizontal_cirkit.json`  
**For:** Bafang (cacao), Bertoua (cassava), Maroua (groundnut)  
**Sensors:** Soil moisture, soil pH, DHT22, NPK, BH1750, rain gauge  
**Cost:** ~33,700 XAF (~$55 USD)

#### Option B: Vertical Farm Kit (NFT Hydroponics)
**File:** `farmassist_vertical_cirkit.json`  
**For:** Vertical NFT lettuce farm  
**Sensors:** Water temp, water pH, TDS, DO, ultrasonic, DHT22, BH1750  
**Cost:** ~44,500 XAF (~$73 USD)

### Step 3: Import Process

**Method 1: Direct JSON Import**
```
1. Click "File" → "Import" → "From JSON"
2. Upload the .json file
3. CirkitDesigner will render the complete circuit
```

**Method 2: Manual Component Placement**
If CirkitDesigner doesn't support direct JSON import, follow the component-by-component guide below.

---

## Component-by-Component Build Guide

### FOR HORIZONTAL FARM KIT

#### 1. Add ESP32-DevKitC-32E
- Search component library: "ESP32"
- Place at center of canvas (400, 300)
- Model: ESP32-WROOM-32E

#### 2. Add Power Components
- **12V Power Supply** → Position (100, 300)
- **LM2596 Buck Converter** → Position (100, 400)
  - Adjust output to 5V using onboard potentiometer

#### 3. Add Sensors (Left Side)
- **DHT22** → Position (200, 150)
  - Air temperature & humidity
- **Capacitive Soil Moisture** → Position (200, 250)
  - Analog output sensor
- **Analog pH Sensor** → Position (200, 350)
  - Soil acidity measurement
- **BH1750** → Position (200, 450)
  - I2C light sensor

#### 4. Add Advanced Sensors (Right Side)
- **RS485 NPK Sensor** → Position (600, 150)
  - Requires MAX485 module
- **Rain Gauge** → Position (600, 250)
  - Digital pulse counter

#### 5. Add Actuators & Output
- **4-Channel Relay Module** → Position (600, 350)
  - Controls pump, valve, fan
- **Active Buzzer** → Position (600, 450)
  - Alert notifications

#### 6. Add Communication Module
- **MAX485 Module** → Position (600, 50)
  - UART to RS485 converter for NPK sensor

---

### WIRING GUIDE - HORIZONTAL KIT

#### Power Distribution
```
12V Supply (+) → Buck Converter IN+
12V Supply (GND) → Buck Converter IN-
Buck Converter OUT+ (5V) → ESP32 5V pin
Buck Converter OUT- → ESP32 GND
ESP32 3.3V → All sensor VCC (except HC-SR04, relays)
```

#### DHT22 Connections
```
DHT22 VCC → ESP32 3.3V
DHT22 GND → ESP32 GND
DHT22 DATA → ESP32 GPIO4 (with 10K pull-up to VCC)
```

#### Soil Moisture Sensor
```
Moisture VCC → ESP32 3.3V
Moisture GND → ESP32 GND
Moisture AOUT → ESP32 GPIO34 (analog input-only pin)
```

#### Soil pH Sensor
```
pH VCC → ESP32 3.3V
pH GND → ESP32 GND
pH PO → ESP32 GPIO35 (analog input-only pin)
```

#### BH1750 Light Sensor (I2C)
```
BH1750 VCC → ESP32 3.3V
BH1750 GND → ESP32 GND
BH1750 SDA → ESP32 GPIO21 (with 4.7K pull-up)
BH1750 SCL → ESP32 GPIO22 (with 4.7K pull-up)
BH1750 ADDR → ESP32 GND (sets I2C address to 0x23)
```

#### NPK Sensor via RS485
```
MAX485 VCC → Buck Converter 5V
MAX485 GND → Buck Converter GND
MAX485 RO → ESP32 GPIO16 (UART RX)
MAX485 DI → ESP32 GPIO17 (UART TX)
MAX485 DE → ESP32 GPIO18 (Driver Enable)
MAX485 RE → ESP32 GPIO18 (tied to DE)
MAX485 A → NPK Sensor A+
MAX485 B → NPK Sensor B-

NPK Sensor VCC → 12V Supply (+)
NPK Sensor GND → 12V Supply (GND)
```

#### Rain Gauge
```
Rain Gauge VCC → ESP32 3.3V
Rain Gauge GND → ESP32 GND
Rain Gauge OUT → ESP32 GPIO15 (digital interrupt)
```

#### 4-Channel Relay Module
```
Relay VCC → Buck Converter 5V
Relay GND → Buck Converter GND
Relay IN1 → ESP32 GPIO25 (Pump control)
Relay IN2 → ESP32 GPIO26 (Valve control)
Relay IN3 → ESP32 GPIO27 (Fan control)
Relay IN4 → ESP32 GPIO32 (Reserved)
```

#### Buzzer
```
Buzzer (+) → Buck Converter 5V
Buzzer (-) → NPN Transistor Collector
Transistor Base → ESP32 GPIO23 (via 1K resistor)
Transistor Emitter → GND
```

---

### FOR VERTICAL FARM KIT

#### 1. Add ESP32-DevKitC-32E
- Search: "ESP32"
- Position: (400, 300)

#### 2. Add Power Components
- **12V Power Supply** → (100, 300)
- **LM2596 Buck Converter** → (100, 400)

#### 3. Add Environmental Sensors (Left Side)
- **DHT22** → (200, 100)
- **DS18B20 Waterproof** → (200, 200)
- **Gravity pH Sensor** → (200, 300)
- **Gravity TDS Sensor** → (200, 400)
- **HC-SR04 Ultrasonic** → (200, 500)

#### 4. Add Monitoring Sensors (Right Side)
- **BH1750 Light Sensor** → (600, 100)
- **Gravity DO Sensor** → (600, 200)
- **DS3231 RTC Module** → (600, 300)

#### 5. Add Control & Output
- **4-Channel Relay Module** → (600, 400)
- **Active Buzzer** → (600, 500)

---

### WIRING GUIDE - VERTICAL KIT

#### Power Distribution
```
12V Supply (+) → Buck Converter IN+
12V Supply (GND) → Buck Converter IN-
Buck 5V OUT → ESP32 5V, HC-SR04 VCC, Relay VCC
Buck GND → ESP32 GND
ESP32 3.3V → All other sensors
```

#### DHT22 (Air Temp/Humidity)
```
DHT22 VCC → ESP32 3.3V
DHT22 GND → ESP32 GND
DHT22 DATA → ESP32 GPIO4 (10K pull-up)
```

#### DS18B20 (Water Temperature)
```
DS18B20 VCC → ESP32 3.3V
DS18B20 GND → ESP32 GND
DS18B20 DQ → ESP32 GPIO5 (4.7K pull-up for 1-Wire)
```

#### Water pH Sensor
```
pH VCC → ESP32 3.3V
pH GND → ESP32 GND
pH PO → ESP32 GPIO34
```

#### TDS/EC Sensor
```
TDS VCC → ESP32 3.3V
TDS GND → ESP32 GND
TDS AOUT → ESP32 GPIO35
```

#### HC-SR04 Ultrasonic (Water Level)
```
HC-SR04 VCC → Buck 5V OUT
HC-SR04 GND → Buck GND
HC-SR04 TRIG → ESP32 GPIO12
HC-SR04 ECHO → Voltage Divider → ESP32 GPIO13

IMPORTANT: Voltage Divider for ECHO
HC-SR04 outputs 5V, ESP32 GPIO is 3.3V
Use: 5V → 1KΩ → GPIO13 → 2KΩ → GND
Result: 3.33V safe level
```

#### BH1750 Light Sensor (I2C)
```
BH1750 VCC → ESP32 3.3V
BH1750 GND → ESP32 GND
BH1750 SDA → ESP32 GPIO21 (4.7K pull-up)
BH1750 SCL → ESP32 GPIO22 (4.7K pull-up)
BH1750 ADDR → GND (I2C address 0x23)
```

#### Dissolved Oxygen Sensor
```
DO VCC → ESP32 3.3V
DO GND → ESP32 GND
DO AOUT → ESP32 GPIO32
```

#### DS3231 RTC Module (I2C)
```
RTC VCC → ESP32 3.3V
RTC GND → ESP32 GND
RTC SDA → ESP32 GPIO21 (shared I2C)
RTC SCL → ESP32 GPIO22 (shared I2C)
I2C Address: 0x68
```

#### 4-Channel Relay Module
```
Relay VCC → Buck 5V
Relay GND → Buck GND
Relay IN1 → ESP32 GPIO25 (Nutrient Pump)
Relay IN2 → ESP32 GPIO26 (pH Up Pump)
Relay IN3 → ESP32 GPIO27 (pH Down Pump)
Relay IN4 → ESP32 GPIO33 (Grow Light)
```

#### Buzzer
```
Buzzer VCC → Buck 5V
Buzzer GND → NPN Transistor
Transistor Base → ESP32 GPIO23 (1K resistor)
Transistor Emitter → GND
```

---

## Critical Design Notes

### Pull-Up Resistors Required
- **DHT22 DATA:** 10K to VCC
- **DS18B20 DQ:** 4.7K to VCC (1-Wire protocol)
- **I2C SDA/SCL:** 4.7K to 3.3V (both lines)

### Voltage Level Shifting
- **HC-SR04 ECHO:** Must use voltage divider (5V → 3.3V)
  - Resistor values: 1KΩ (top) + 2KΩ (bottom)
  - Formula: Vout = 5V × (2K/(1K+2K)) = 3.33V

### GPIO Pin Selection Rules
- **GPIO34-39:** Input-only, no internal pull-ups (use for analog sensors)
- **GPIO6-11:** Reserved for flash, DO NOT USE
- **GPIO0:** Boot mode pin, avoid for critical functions
- **GPIO21/22:** I2C bus, can share multiple devices

### I2C Bus (Shared)
```
Multiple devices on same bus:
- BH1750: 0x23
- DS3231: 0x68
All share GPIO21 (SDA) and GPIO22 (SCL)
```

---

## Testing Checklist

### Phase 1: Power On Test
- [ ] Buck converter outputs stable 5V
- [ ] ESP32 blue LED lights up
- [ ] No components overheating
- [ ] Multimeter check: 3.3V on ESP32 3V3 pin

### Phase 2: Sensor Reading Test
- [ ] DHT22 returns temp/humidity via Serial
- [ ] Soil moisture/pH show analog values
- [ ] BH1750 I2C communication (check address scan)
- [ ] DS18B20 1-Wire detection
- [ ] Ultrasonic distance reading

### Phase 3: MQTT Communication Test
- [ ] ESP32 connects to WiFi
- [ ] MQTT broker connection established
- [ ] Telemetry published to correct topic
- [ ] Commands received from broker

### Phase 4: Actuator Control Test
- [ ] Relay clicks when GPIO set HIGH
- [ ] Buzzer sounds on command
- [ ] Pumps/valves operate correctly
- [ ] No relay chattering or bouncing

---

## Troubleshooting

### ESP32 Won't Boot
- Check 5V power supply voltage
- Verify GND connections
- Press EN button to reset
- Check GPIO0 is not pulled LOW

### I2C Sensors Not Detected
- Run I2C scanner sketch
- Verify pull-up resistors (4.7K)
- Check SDA/SCL not swapped
- Confirm sensor I2C address

### Analog Sensors Return 0 or 4095
- GPIO34-39 have no pull-ups (expected if floating)
- Verify sensor VCC is 3.3V
- Check ADC attenuation in code: `analogSetAttenuation(ADC_11db)`

### RS485 No Response
- DE/RE must go HIGH before TX
- Verify baud rate (9600 for NPK)
- Check A/B wiring (not swapped)
- Ensure 12V power to NPK sensor

### MQTT Connection Fails
- Check WiFi credentials
- Verify broker address/port
- Test broker with mosquitto_pub/sub
- Check firewall rules

---

## Next Steps After Circuit Assembly

1. **Flash Firmware:**
   - Use Arduino IDE or PlatformIO
   - Install libraries from Section 7 of main spec
   - Upload sketch via USB

2. **Calibrate Sensors:**
   - Follow Appendix B in main specification
   - Store calibration coefficients in EEPROM

3. **Backend Integration:**
   - Deploy Mosquitto MQTT broker
   - Set up Bun + Hono API server
   - Configure Prisma + TimescaleDB

4. **Mobile App Testing:**
   - Install React Native app on device
   - Subscribe to telemetry topics via WebSocket
   - Test FCM notifications

5. **Demo Preparation:**
   - Build 3x Horizontal + 1x Vertical kits
   - 24-hour burn-in test
   - Practice anomaly injection scenarios

---

## Bill of Materials Export

CirkitDesigner can export BOM as CSV for procurement:

**File → Export → Bill of Materials → CSV**

Import this into Excel/Sheets to:
- Add supplier links (AliExpress, Jumia)
- Track shipment status
- Calculate total costs per kit
- Manage inventory

---

## PCB Design (Future)

Once breadboard prototype validated:
1. Export netlist from CirkitDesigner
2. Import into KiCad or EasyEDA
3. Design custom PCB layout
4. Order from JLCPCB or PCBWay
5. Assemble production units

---

## Support Resources

**CirkitDesigner Help:**
- https://cirkitdesigner.com/docs
- Email: support@cirkitdesigner.com

**ESP32 Pinout:**
- https://randomnerdtutorials.com/esp32-pinout-reference-gpios/

**Arduino Libraries:**
- PubSubClient: https://github.com/knolleary/pubsubclient
- ArduinoJson: https://arduinojson.org/
- DHT: https://github.com/adafruit/DHT-sensor-library

**FarmAssist+ Team:**
- Lead: Gilles Momeni (Menoc61)
- Competition: GCD4F 2026
- Project: AI for Science - Smart Farming

---

**GOOD LUCK WITH YOUR BUILD!** 🚀🌱
