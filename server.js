const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let telemetry = {
  bpm: null,
  simulated_bpm: null,
  status: "NO_SIGNAL",
  alert: false,
  sensor_raw: null,
  uptime_ms: 0,
  received_at: null
};

/*
========================================================
GET CURRENT TELEMETRY
Frontend calls:
GET http://localhost:3000/api/telemetry
========================================================
*/

app.get("/api/telemetry", (req, res) => {
  res.json(telemetry);
});


/*
========================================================
POST TELEMETRY
ESP32 / Wokwi bridge can send:

{
  "bpm": 73.4,
  "simulated_bpm": 73.4,
  "status": "NORMAL",
  "alert": false,
  "sensor_raw": 1245,
  "uptime_ms": 3697
}
========================================================
*/

app.post("/api/telemetry", (req, res) => {

  const data = req.body;

  telemetry = {
    bpm: data.bpm ?? null,
    simulated_bpm: data.simulated_bpm ?? null,
    status: data.status ?? "NO_SIGNAL",
    alert: Boolean(data.alert),
    sensor_raw: data.sensor_raw ?? null,
    uptime_ms: data.uptime_ms ?? 0,
    received_at: new Date().toISOString()
  };

  console.log("Telemetry received:");
  console.log(telemetry);

  res.json({
    success: true,
    telemetry
  });
});


/*
========================================================
HEALTH CHECK
========================================================
*/

app.get("/api/health", (req, res) => {

  res.json({
    service: "BEATNEX Telemetry Bridge",
    status: "ONLINE",
    timestamp: new Date().toISOString()
  });

});


/*
========================================================
START SERVER
========================================================
*/

app.listen(PORT, () => {

  console.log("");
  console.log("================================");
  console.log(" BEATNEX TELEMETRY BRIDGE");
  console.log("================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Telemetry: http://localhost:${PORT}/api/telemetry`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log("================================");
  console.log("");

});