````markdown
# ❤️ BeatNex — Heartbeat Monitor with Alert System

> A real-time heartbeat monitoring system that integrates **ESP32/Wokwi simulation, backend telemetry, live BPM visualization, ECG-style waveform rendering, and threshold-based alerts** into a unified monitoring dashboard.

## 📌 Overview

**BeatNex** is an embedded-systems and IoT-based heartbeat monitoring prototype designed to demonstrate the complete flow of real-time physiological telemetry from a simulated sensor to a web-based monitoring dashboard. The system uses an **ESP32 simulated in Wokwi** to generate heartbeat telemetry, sends the data to a **Node.js/Express backend**, and continuously delivers the latest telemetry to the frontend through a REST API.

The dashboard uses the latest backend `bpm` value as its **source of truth**. The same BPM value drives the live BPM display, BPM Trend, and ECG-style waveform, ensuring that all visualizations remain synchronized with the actual telemetry received by the system.

> ⚠️ **Note:** BeatNex is an educational and engineering prototype. It is not intended for medical diagnosis, clinical monitoring, or emergency decision-making.

---

## ✨ Key Features

- ❤️ Real-time BPM monitoring
- 📡 REST-based telemetry communication
- 🔌 ESP32-based embedded simulation
- 🧪 Wokwi virtual hardware environment
- 📊 Live BPM Trend visualization
- 📈 Dynamic ECG-style waveform
- 🚨 Threshold-based heart-rate alerts
- 🟢 Normal / 🔴 High BPM classification
- 📟 Raw sensor-value monitoring
- 🔄 Continuous backend telemetry polling
- ⚡ Real-time dashboard updates
- 🖥️ Responsive monitoring interface
- 🔗 Synchronized BPM, Trend, ECG, and alert states
- 🛠️ Terminal-based telemetry testing with cURL

---

## 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │      ESP32 / Wokwi   │
                    │                      │
                    │  Simulated Heartbeat │
                    │      Telemetry       │
                    └──────────┬───────────┘
                               │
                               │ POST /api/telemetry
                               ▼
                    ┌──────────────────────┐
                    │     Node.js /        │
                    │     Express Backend  │
                    │                      │
                    │   Latest Telemetry   │
                    └──────────┬───────────┘
                               │
                               │ GET /api/telemetry/latest
                               ▼
                    ┌──────────────────────┐
                    │    BeatNex Frontend  │
                    │                      │
                    │  ┌────────────────┐  │
                    │  │ Current BPM    │  │
                    │  ├────────────────┤  │
                    │  │ BPM Trend      │  │
                    │  ├────────────────┤  │
                    │  │ ECG Waveform   │  │
                    │  ├────────────────┤  │
                    │  │ Status / Alert │  │
                    │  └────────────────┘  │
                    └──────────────────────┘
````

---

## 🔄 Telemetry Flow

BeatNex follows a simple real-time telemetry pipeline:

```text
Heartbeat Simulation
        ↓
ESP32 / Wokwi
        ↓
Telemetry Payload
        ↓
POST /api/telemetry
        ↓
Backend Stores Latest Data
        ↓
GET /api/telemetry/latest
        ↓
Frontend Polling
        ↓
dashboardBPM
        ↓
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
▼              ▼              ▼              ▼
BPM Card    BPM Trend      ECG Waveform   Alert State
```

The latest `bpm` value received from the backend is the **single source of truth** for the dashboard.

---

## 🧠 BPM Processing

The frontend continuously polls the backend for the latest telemetry.

```javascript
const response = await fetch(
    "http://localhost:3000/api/telemetry/latest"
);

const data = await response.json();

if (typeof data.bpm === "number") {
    dashboardBPM = data.bpm;
} else if (data.bpm !== undefined) {
    dashboardBPM = parseFloat(data.bpm);
}
```

This means the dashboard does **not** use an independent hardcoded BPM simulation.

For example:

```text
Terminal Input
     ↓
73.4 BPM
     ↓
Backend
     ↓
Frontend
     ↓
Dashboard = 73.4 BPM
```

If the next telemetry value is:

```text
125.2 BPM
```

the dashboard automatically transitions to:

```text
125.2 BPM
```

---

## 📊 BPM Trend

The BPM Trend represents the actual sequence of BPM values received from the backend.

A small micro-fluctuation is added only as a visual heart-rate variability effect:

```javascript
const hrvWobble = (Math.random() - 0.5) * 1.2;
const liveTrendPoint = dashboardBPM + hrvWobble;
```

The random component is limited to approximately **±0.6 BPM** around the current telemetry value.

For example, if the latest BPM is:

```text
73.4 BPM
```

the trend may produce:

```text
73.1 → 73.6 → 73.3 → 73.8 → 73.4
```

If the latest BPM changes to:

```text
125.2 BPM
```

the trend follows the new value:

```text
124.8 → 125.5 → 125.0 → 125.6 → 124.9
```

Therefore, the trend is driven by **actual terminal/backend inputs**, not by an independent random BPM generator.

---

## 📈 ECG Waveform

The ECG-style waveform is synchronized with the same `dashboardBPM` value used by the BPM display and trend.

The waveform timing is calculated from the current BPM:

```javascript
const safeBPM = Math.max(1, dashboardBPM);

const pulseCycleLength = Math.max(
    40,
    22000 / safeBPM
);
```

As BPM increases:

```text
Higher BPM
    ↓
Shorter pulse interval
    ↓
Faster ECG waveform
```

As BPM decreases:

```text
Lower BPM
    ↓
Longer pulse interval
    ↓
Slower ECG waveform
```

This keeps the **BPM card, BPM Trend, and ECG waveform synchronized** with the latest telemetry.

---

## 🚨 Alert & Classification

BeatNex classifies incoming telemetry according to the configured heart-rate thresholds.

### Normal Example

```text
BPM: 79.4
Status: NORMAL
Alert: CLEAR
```

### High Example

```text
BPM: 125.2
Status: HIGH
Alert: ACTIVE
```

When a high BPM value is received, the dashboard updates the relevant status and alert indicators while maintaining the existing monitoring interface.

---

## 🧪 Example Telemetry

### Normal BPM

```bash
curl -X POST http://localhost:3000/api/telemetry -H "Content-Type: application/json" -d "{\"bpm\":73.4,\"simulated_bpm\":73.4,\"status\":\"NORMAL\",\"alert\":false,\"sensor_raw\":1245,\"uptime_ms\":3697}"
```

### High BPM

```bash
curl -X POST http://localhost:3000/api/telemetry -H "Content-Type: application/json" -d "{\"bpm\":125.2,\"simulated_bpm\":125.2,\"status\":\"HIGH\",\"alert\":true,\"sensor_raw\":3695,\"uptime_ms\":79738}"
```

---

## 📋 Test Scenarios

### 🟢 Normal Rising Trend

Send the following BPM values sequentially:

```text
73.4 → 74.8 → 76.2 → 78.1 → 79.4 BPM
```

Expected behavior:

```text
BPM Display
73.4 → 74.8 → 76.2 → 78.1 → 79.4

Trend
Gradual upward movement around the actual BPM values

ECG
Progressively faster pulse timing

Status
NORMAL

Alert
CLEAR
```

### 🔴 High Rising Trend

Send:

```text
102.8 → 108.6 → 114.9 → 120.7 → 125.2 BPM
```

Expected behavior:

```text
BPM Display
102.8 → 108.6 → 114.9 → 120.7 → 125.2

Trend
Clear upward movement

ECG
Progressively faster waveform

Status
HIGH

Alert
ACTIVE
```

---

## 🛠️ Technology Stack

### Embedded Systems

* ESP32
* Wokwi
* Arduino / C++
* Simulated pulse telemetry

### Backend

* Node.js
* Express.js
* REST API
* JSON telemetry

### Frontend

* HTML5
* CSS3
* JavaScript
* Chart.js
* Canvas API

### Development

* Visual Studio Code
* Git
* GitHub
* cURL
* Wokwi

---

## 📁 Project Structure

```text
Heartbeat-Monitor-with-Alert-System/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── wokwi
|   ├── diagram.json
|    ├── sketch.ino
|    ├── libraries.txt
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR-GITHUB-REPOSITORY-URL>
cd Heartbeat-Monitor-with-Alert-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Backend

```bash
node backend/server.js
```

The API should be available at:

```text
http://localhost:3000
```

### 4. Start the Frontend

Open the frontend using your local development server.

The dashboard will continuously request:

```text
GET /api/telemetry/latest
```

and update the monitoring interface with the latest telemetry.

---

## 🔌 API Reference

### POST `/api/telemetry`

Receives heartbeat telemetry.

#### Request

```json
{
  "bpm": 73.4,
  "simulated_bpm": 73.4,
  "status": "NORMAL",
  "alert": false,
  "sensor_raw": 1245,
  "uptime_ms": 3697
}
```

#### Response

```json
{
  "success": true,
  "telemetry": {
    "bpm": 73.4,
    "simulated_bpm": 73.4,
    "status": "NORMAL",
    "alert": false,
    "sensor_raw": 1245,
    "uptime_ms": 3697
  }
}
```

---

### GET `/api/telemetry/latest`

Returns the most recently received telemetry.

#### Example Response

```json
{
  "bpm": 73.4,
  "simulated_bpm": 73.4,
  "status": "NORMAL",
  "alert": false,
  "sensor_raw": 1245,
  "uptime_ms": 3697
}
```

---

## 🔍 System Logic

```text
             ┌───────────────────┐
             │ Incoming Telemetry│
             └─────────┬─────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Validate BPM   │
              └───────┬────────┘
                      │
                      ▼
             ┌──────────────────┐
             │  dashboardBPM    │
             └────────┬─────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
      BPM Card     BPM Trend     ECG
          │           │           │
          └───────────┼───────────┘
                      ▼
               Status / Alert
```

---

## 🎯 Design Objectives

BeatNex was developed with the following engineering goals:

* Real-time telemetry processing
* Embedded-system simulation
* REST-based device communication
* API-driven dashboard architecture
* Synchronized data visualization
* Dynamic heart-rate monitoring
* Event-based alerting
* Hardware-independent prototyping
* Clear separation between embedded, backend, and frontend layers
* Practical demonstration of an IoT monitoring workflow

---

## 🔮 Future Enhancements

Potential future improvements include:

* Physical pulse sensor integration
* Cloud-based telemetry storage
* Historical BPM analysis
* WebSocket-based real-time communication
* Persistent database integration
* Remote alert notifications
* Mobile monitoring application
* Multi-device monitoring
* Advanced anomaly detection
* Machine-learning-based heart-rate analysis
* Long-term patient trend analysis

---

## ⚠️ Disclaimer

BeatNex is an **educational and engineering prototype** developed for demonstrating embedded systems, IoT telemetry, real-time visualization, and alert mechanisms.

It is **not a certified medical device** and must not be used for clinical diagnosis, treatment, or emergency medical decisions.

---

