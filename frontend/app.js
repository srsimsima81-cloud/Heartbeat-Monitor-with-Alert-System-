/* ============================================================
   BEATNEX — Heartbeat Monitor with Alert System
   Frontend telemetry dashboard
   ============================================================ */

const CONFIG = {
  // Backend/bridge endpoint.
  // Keep this ready for the ESP32/Wokwi bridge.
  API_URL: "http://localhost:3000/api/telemetry/latest",

  // Used only when no bridge is connected.
  // IMPORTANT: these are NOT fake dashboard values.
  // Dashboard remains NO SIGNAL until real telemetry arrives.
  POLL_INTERVAL: 1000,

  MAX_HISTORY: 60,
  LOW_THRESHOLD: 60,
  HIGH_THRESHOLD: 100
};

/* ============================================================
   STATE
   ============================================================ */

const state = {
  connected: false,
  bpm: null,
  simulatedBpm: null,
  status: "NO_SIGNAL",
  alert: false,
  sensorRaw: null,
  uptimeMs: null,
  lastPacket: null,
  history: [],
  events: []
};

let dashboardBPM = null;

/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function formatBpm(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toFixed(1);
}

function formatRaw(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value;
}

function formatUptime(ms) {
  if (ms === null || ms === undefined) {
    return "—";
  }

  const seconds = Math.floor(Number(ms) / 1000);

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

function formatTime(date) {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/* ============================================================
   STATUS HELPERS
   ============================================================ */

function normalizeStatus(status, bpm) {
  if (!status) {
    if (bpm === null || bpm === undefined) {
      return "NO_SIGNAL";
    }

    if (bpm < CONFIG.LOW_THRESHOLD) {
      return "LOW";
    }

    if (bpm > CONFIG.HIGH_THRESHOLD) {
      return "HIGH";
    }

    return "NORMAL";
  }

  return String(status).toUpperCase();
}

function isNormal() {
  return state.status === "NORMAL";
}

function isAlert() {
  return (
    state.status === "LOW" ||
    state.status === "HIGH" ||
    state.alert === true
  );
}

/* ============================================================
   CONNECTION STATUS
   ============================================================ */

function updateConnectionUI() {
  const pill = $("connectionPill");
  const text = $("connectionText");

  if (!pill || !text) return;

  if (state.connected) {
    pill.classList.remove("alert");
    pill.classList.add("online");

    text.textContent = "Wokwi bridge connected";
  } else {
    pill.classList.remove("online");
    pill.classList.add("alert");

    text.textContent = "Wokwi bridge offline";
  }
}

/* ============================================================
   DASHBOARD THEME / STATUS
   ============================================================ */

function updateStatusTheme() {
  const body = document.body;

  body.classList.remove(
    "status-normal",
    "status-alert",
    "status-nosignal"
  );

  if (state.status === "NORMAL") {
    body.classList.add("status-normal");
  } else if (isAlert()) {
    body.classList.add("status-alert");
  } else {
    body.classList.add("status-nosignal");
  }

  const statusValue = $("statusValue");
  const statusChip = $("statusChip");
  const alertValue = $("alertValue");
  const alertDot = $("alertDot");
  const stateBadge = $("stateBadge");
  const stateVisual = $("stateVisual");

  if (statusValue) {
    statusValue.textContent = state.status.replace("_", " ");
  }

  if (statusChip) {
    statusChip.textContent = state.status.replace("_", " ");

    statusChip.classList.remove(
      "normal",
      "alert"
    );

    if (state.status === "NORMAL") {
      statusChip.classList.add("normal");
    } else if (isAlert()) {
      statusChip.classList.add("alert");
    }
  }

  if (alertValue) {
    alertValue.textContent = isAlert() ? "ALERT" : "CLEAR";
  }

  if (alertDot) {
    alertDot.classList.toggle("active", isAlert());
  }

  if (stateBadge) {
    stateBadge.textContent = state.status.replace("_", " ");

    stateBadge.classList.remove(
      "normal",
      "alert"
    );

    if (state.status === "NORMAL") {
      stateBadge.classList.add("normal");
    } else if (isAlert()) {
      stateBadge.classList.add("alert");
    }
  }

  if (stateVisual) {
    stateVisual.classList.remove(
      "normal",
      "alert",
      "nosignal"
    );

    if (state.status === "NORMAL") {
      stateVisual.classList.add("normal");
    } else if (isAlert()) {
      stateVisual.classList.add("alert");
    } else {
      stateVisual.classList.add("nosignal");
    }
  }
}

/* ============================================================
   BPM DISPLAY
   ============================================================ */

function updateBpmDisplay() {
  const bpm = formatBpm(state.bpm);

  setText("bpmValue", bpm);
  setText("waveBpm", bpm);
  setText("heroBpm", bpm);

  setText(
    "simValue",
    formatBpm(state.simulatedBpm)
  );

  setText(
    "sensorRaw",
    state.sensorRaw === null
      ? "ADC —"
      : `ADC ${state.sensorRaw}`
  );

  setText(
    "rawValue",
    formatRaw(state.sensorRaw)
  );

  setText(
    "uptimeValue",
    formatUptime(state.uptimeMs)
  );

  setText(
    "packetValue",
    state.lastPacket
      ? formatTime(state.lastPacket)
      : "—"
  );

  setText(
    "heroStatus",
    state.status.replace("_", " ")
  );

  if (state.bpm === null) {
    setText("bpmTrend", "Awaiting telemetry");
  } else if (state.status === "NORMAL") {
    setText("bpmTrend", "Within normal range");
  } else if (isAlert()) {
    setText("bpmTrend", "Threshold exceeded");
  } else {
    setText("bpmTrend", "Signal unavailable");
  }

  if (isAlert()) {
    setText(
      "alertDescription",
      state.status === "LOW"
        ? "BPM below 60"
        : state.status === "HIGH"
          ? "BPM above 100"
          : "Threshold alert active"
    );
  } else if (state.status === "NORMAL") {
    setText(
      "alertDescription",
      "No threshold alert"
    );
  } else {
    setText(
      "alertDescription",
      "Waiting for valid signal"
    );
  }

  setText(
    "classDetail",
    state.status.replace("_", " ")
  );

  setText(
    "outputDetail",
    isAlert()
      ? "RED LED + BUZZER"
      : state.status === "NORMAL"
        ? "GREEN LED"
        : "Inactive"
  );

  setText(
    "heroUpdated",
    state.lastPacket
      ? formatTime(state.lastPacket)
      : "—"
  );
}

/* ============================================================
   THRESHOLD METER
   ============================================================ */

function updateMeter() {
  const marker = $("meterMarker");

  if (!marker) return;

  /*
    Meter represents approximately 40–150 BPM.
  */

  if (
    state.bpm === null ||
    state.bpm === undefined ||
    Number.isNaN(Number(state.bpm))
  ) {
    marker.style.left = "0%";
    marker.style.opacity = "0.25";
    return;
  }

  const min = 40;
  const max = 150;

  let percentage =
    ((Number(state.bpm) - min) / (max - min)) * 100;

  percentage = Math.max(
    0,
    Math.min(100, percentage)
  );

  marker.style.left = `${percentage}%`;
  marker.style.opacity = "1";
}

/* ============================================================
   TELEMETRY PROCESSING
   ============================================================ */

/* ============================================================
   BPM TELEMETRY
   ============================================================ */

let incomingBPM = null;

if (data.bpm !== undefined && data.bpm !== null) {

  const parsedBPM = Number(data.bpm);

  if (
    Number.isFinite(parsedBPM) &&
    parsedBPM > 0
  ) {
    incomingBPM = parsedBPM;

    /*
      Backend data.bpm is the source of truth.
    */

    state.bpm = parsedBPM;
    dashboardBPM = parsedBPM;
  }
}


/* ============================================================
   SIMULATED BPM — DISPLAY ONLY
   ============================================================ */

if (
  data.simulated_bpm !== undefined &&
  data.simulated_bpm !== null
) {

  const parsedSimulatedBPM =
    Number(data.simulated_bpm);

  if (Number.isFinite(parsedSimulatedBPM)) {
    state.simulatedBpm = parsedSimulatedBPM;
  }
}


/* ============================================================
   STATUS
   ============================================================ */

state.status = normalizeStatus(
  data.status,
  state.bpm
);

state.alert =
  data.alert === true ||
  state.status === "LOW" ||
  state.status === "HIGH";


updateHeartRateCard();

  if (
    data.sensor_raw !== undefined &&
    data.sensor_raw !== null
  ) {
    state.sensorRaw = Number(data.sensor_raw);
  }

  if (
    data.uptime_ms !== undefined &&
    data.uptime_ms !== null
  ) {
    state.uptimeMs = Number(data.uptime_ms);
  }

  state.lastPacket = new Date();

  /* ============================================================
   HERO BPM RING STATUS
   ============================================================ */

const heroRing = document.getElementById("heroRing");

if (heroRing) {
  heroRing.classList.remove(
    "normal",
    "alert",
    "no-signal"
  );

  if (state.status === "NORMAL") {
    heroRing.classList.add("normal");
  }
  else if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {
    heroRing.classList.add("alert");
  }
  else {
    heroRing.classList.add("no-signal");
  }
}

  /*
    Only store actual received BPM values.
    No dummy values are generated here.
  */

/*
  Store a visual trend point based on the latest
  real backend BPM.

  The small wobble is ONLY a visual HRV-style effect.
  It never replaces or changes dashboardBPM.
*/

if (
  Number.isFinite(dashboardBPM) &&
  dashboardBPM > 0
) {

  const hrvWobble =
    (Math.random() - 0.5) * 1.2;

  const liveTrendPoint =
    dashboardBPM + hrvWobble;

  state.history.push({
    bpm: liveTrendPoint,
    sourceBpm: dashboardBPM,
    timestamp: Date.now()
  });

  if (
    state.history.length >
    CONFIG.MAX_HISTORY
  ) {
    state.history.shift();
  }
}

  function updateHeartRateCard() {

  const card = document.getElementById("heartRateCard");
  const bpmValue = document.getElementById("bpmValue");
  const bpmTrend = document.getElementById("bpmTrend");
  const bpmTag = document.getElementById("bpmTag");

  if (!card || !bpmValue || !bpmTrend || !bpmTag) {
    return;
  }

  // Reset states
  card.classList.remove(
    "normal",
    "abnormal",
    "no-signal"
  );

  bpmTag.classList.remove(
    "normal",
    "alert"
  );

  // No valid BPM
  if (
    state.bpm === null ||
    !Number.isFinite(state.bpm) ||
    state.bpm <= 0
  ) {

    bpmValue.textContent = "—";
    bpmTrend.textContent = "No signal";
    bpmTag.textContent = "NO SIGNAL";

    card.classList.add("no-signal");

    return;
  }

  // Display BPM
  bpmValue.textContent = state.bpm.toFixed(1);

  // NORMAL
  if (state.status === "NORMAL") {

    card.classList.add("normal");
    bpmTag.classList.add("normal");

    bpmTrend.textContent = "Within normal range";
    bpmTag.textContent = "NORMAL";

  }

  // LOW / HIGH
  else if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {

    card.classList.add("abnormal");
    bpmTag.classList.add("alert");

    if (state.status === "LOW") {
      bpmTrend.textContent = "Below normal range";
    } else {
      bpmTrend.textContent = "Above normal range";
    }

    bpmTag.textContent = "ALERT";

  }

  // Anything else
  else {

    card.classList.add("no-signal");

    bpmTrend.textContent = "No signal";
    bpmTag.textContent = "NO SIGNAL";
  }
}

  updateDashboard();
  drawWaveform();
  drawTrendChart();


/* ============================================================
   DASHBOARD UPDATE
   ============================================================ */

function updateDashboard() {

  const statusIcon = document.getElementById("statusIcon");

if (statusIcon) {
  statusIcon.classList.remove(
    "normal",
    "alert",
    "neutral"
  );

  if (state.status === "NORMAL") {
    statusIcon.classList.add("normal");
  } 
  else if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {
    statusIcon.classList.add("alert");
  } 
  else {
    statusIcon.classList.add("neutral");
  }
}

const alertIcon = document.getElementById("alertIcon");

if (alertIcon) {
  alertIcon.classList.remove("normal", "alert", "neutral");

  if (state.status === "NORMAL") {
    alertIcon.classList.add("normal");
  } 
  else if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {
    alertIcon.classList.add("alert");
  } 
  else {
    alertIcon.classList.add("neutral");
  }
}
  updateConnectionUI();
  updateBpmDisplay();
  updateStatusTheme();
  updateMeter();
}

/* ============================================================
   RESET
   ============================================================ */

function resetDashboard() {
  state.connected = false;
  state.bpm = null;
  state.simulatedBpm = null;
  state.status = "NO_SIGNAL";
  state.alert = false;
  state.sensorRaw = null;
  state.uptimeMs = null;
  state.lastPacket = null;
  state.history = [];

  updateDashboard();
  drawWaveform();
  drawTrendChart();
}



/* ============================================================
   LIVE ECG WAVEFORM
   ============================================================ */


let ecgAnimationId = null;
let ecgStartTime = performance.now();


function getECGColor() {

  if (state.status === "NORMAL") {
    return "#39d98a";
  }

  if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {
    return "#ef4444";
  }

  return "#596274";
}


function getECGGlow() {

  if (state.status === "NORMAL") {
    return "rgba(57,217,138,.55)";
  }

  if (
    state.status === "LOW" ||
    state.status === "HIGH"
  ) {
    return "rgba(239,68,68,.60)";
  }

  return "rgba(89,98,116,.20)";
}


/*
  Returns the vertical ECG shape for one heartbeat cycle.

  x = progress through one heartbeat
  0 → 1
*/
function ecgShape(progress) {

  /*
    Baseline
  */

  let y = 0;


  /*
    P wave
  */

  if (progress >= 0.10 && progress < 0.20) {

    const p =
      (progress - 0.10) / 0.10;

    y =
      Math.sin(p * Math.PI) * -0.16;
  }


  /*
    Q wave
  */

  else if (progress >= 0.285 && progress < 0.315) {

    const p =
      (progress - 0.285) / 0.03;

    y =
      Math.sin(p * Math.PI) * 0.18;
  }


  /*
    R wave — main heartbeat spike
  */

  else if (progress >= 0.315 && progress < 0.35) {

    const p =
      (progress - 0.315) / 0.035;

    y =
      -Math.sin(p * Math.PI) * 1.0;
  }


  /*
    S wave
  */

  else if (progress >= 0.35 && progress < 0.385) {

    const p =
      (progress - 0.35) / 0.035;

    y =
      Math.sin(p * Math.PI) * 0.38;
  }


  /*
    T wave
  */

  else if (progress >= 0.52 && progress < 0.68) {

    const p =
      (progress - 0.52) / 0.16;

    y =
      Math.sin(p * Math.PI) * -0.25;
  }


  return y;
}


/*
  Draw a continuous ECG line.

  The actual BPM determines the heartbeat frequency.
*/

function drawWaveform() {

  const canvas = $("waveCanvas");

  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  /*
    ----------------------------------------------------------
    NO SIGNAL
    ----------------------------------------------------------
  */

  if (
  !Number.isFinite(dashboardBPM) ||
  dashboardBPM <= 0 ||
  state.status === "NO_SIGNAL"
) {

  drawNoSignalWave(
    ctx,
    width,
    height
  );

  return;
}

  /*
    ----------------------------------------------------------
    BPM → HEARTBEAT SPEED
    ----------------------------------------------------------
  */

  const bpm =
  Math.max(
    40,
    Math.min(
      180,
      dashboardBPM
    )
  );

  const beatDuration = 60000 / bpm;

  const elapsed =
    performance.now() - ecgStartTime;

  const cycleOffset =
    (elapsed % beatDuration) / beatDuration;

  /*
    ----------------------------------------------------------
    GRAPH DIMENSIONS
    ----------------------------------------------------------
  */

  const baseline = height * 0.55;

  const amplitude = height * 0.30;

  /*
    Keep your existing status colors.
  */

  const color = getECGColor();

  const glow = getECGGlow();

  /*
    ----------------------------------------------------------
    ECG PATH
    ----------------------------------------------------------
  */

  const samples = Math.ceil(width);

  const cyclesVisible =
    Math.max(2.5, width / 105);

  function buildPath() {

    ctx.beginPath();

    for (let x = 0; x <= samples; x++) {

      const normalizedX = x / width;

      const progress =
        (
          normalizedX * cyclesVisible +
          cycleOffset
        ) % 1;

      const shape = ecgShape(progress);

      const y =
        baseline +
        shape * amplitude;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }

  /*
    ----------------------------------------------------------
    SOFT GLOW
    ----------------------------------------------------------
  */

  buildPath();

  ctx.save();

  ctx.strokeStyle = glow;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.shadowBlur = 18;
  ctx.shadowColor = glow;

  ctx.stroke();

  ctx.restore();

  /*
    ----------------------------------------------------------
    MAIN ECG LINE
    ----------------------------------------------------------
  */

  buildPath();

  ctx.save();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.shadowBlur = 7;
  ctx.shadowColor = glow;

  ctx.stroke();

  ctx.restore();

  /*
    ----------------------------------------------------------
    CURRENT BPM
    ----------------------------------------------------------
  */

  const bpmLabel = $("waveBpm");

  if (
  bpmLabel &&
  Number.isFinite(dashboardBPM)
) {

  bpmLabel.textContent =
    `${dashboardBPM.toFixed(1)} BPM`;
}
}
/*
  No-signal display.
*/

function drawNoSignalWave(
  ctx,
  width,
  height
) {

  const baseline =
    height * 0.56;


  /*
    Subtle flat line
  */

  ctx.beginPath();

  ctx.moveTo(
    0,
    baseline
  );

  ctx.lineTo(
    width,
    baseline
  );


  ctx.strokeStyle =
    "rgba(89,98,116,.35)";

  ctx.lineWidth =
    1;

  ctx.stroke();


  /*
    Waiting text
  */

  ctx.save();

  ctx.fillStyle =
    "rgba(141,150,168,.45)";

  ctx.font =
    "10px Inter, sans-serif";

  ctx.textAlign =
    "center";

  ctx.fillText(
    "Waiting for heartbeat telemetry...",
    width / 2,
    baseline - 20
  );

  ctx.restore();


  const bpmLabel =
    $("waveBpm");

  if (bpmLabel) {

    bpmLabel.textContent =
      "--";
  }
}


/*
  Continuous animation loop.

  This does not generate telemetry.
  It only redraws the visual representation
  of the latest real BPM.
*/

function animateECG() {

  drawWaveform();

  ecgAnimationId =
    requestAnimationFrame(
      animateECG
    );
}


/*
  Start ECG animation once.
*/

function initializeECG() {

  if (ecgAnimationId !== null) {
    return;
  }

  ecgStartTime =
    performance.now();

  animateECG();
}
/* ============================================================
   TREND CHART — LIVE BPM ANALYTICS
   ============================================================ */

function drawTrendChart() {

  const canvas = $("trendCanvas");

  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  /*
    ----------------------------------------------------------
    NO TELEMETRY
    ----------------------------------------------------------
  */

  if (
    !state.history ||
    state.history.length === 0
  ) {

    ctx.save();

    ctx.fillStyle =
      "rgba(141,150,168,.55)";

    ctx.font =
      "10px Inter, sans-serif";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
      "Waiting for live telemetry...",
      width / 2,
      height / 2
    );

    ctx.restore();

    return;
  }

  /*
    ----------------------------------------------------------
    GRAPH PADDING
    ----------------------------------------------------------
  */

  const padding = {
    top: 22,
    right: 18,
    bottom: 28,
    left: 38
  };

  const graphWidth =
    width -
    padding.left -
    padding.right;

  const graphHeight =
    height -
    padding.top -
    padding.bottom;

  /*
    ----------------------------------------------------------
    BPM SCALE
    ----------------------------------------------------------
  */

  const minBpm = 40;
  const maxBpm = 150;

  function getY(bpm) {

    const normalized =
      (bpm - minBpm) /
      (maxBpm - minBpm);

    return (
      padding.top +
      graphHeight -
      Math.max(
        0,
        Math.min(1, normalized)
      ) * graphHeight
    );
  }

  /*
    ----------------------------------------------------------
    BACKGROUND GRID
    ----------------------------------------------------------
  */

  ctx.save();

  ctx.strokeStyle =
    "rgba(255,255,255,.045)";

  ctx.lineWidth = 1;

  const gridValues =
    [150, 125, 100, 75, 50];

  gridValues.forEach(value => {

    const y = getY(value);

    ctx.beginPath();

    ctx.moveTo(
      padding.left,
      y
    );

    ctx.lineTo(
      width - padding.right,
      y
    );

    ctx.stroke();
  });

  ctx.restore();

  /*
    ----------------------------------------------------------
    Y AXIS LABELS
    ----------------------------------------------------------
  */

  ctx.save();

  ctx.fillStyle =
    "rgba(141,150,168,.60)";

  ctx.font =
    "8px Inter, sans-serif";

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  [150, 125, 100, 75, 50].forEach(value => {

    ctx.fillText(
      value,
      padding.left - 8,
      getY(value)
    );
  });

  ctx.restore();

  /*
    ----------------------------------------------------------
    THRESHOLD LINES
    ----------------------------------------------------------
  */

  drawThresholdLine(
    ctx,
    width,
    height,
    CONFIG.LOW_THRESHOLD,
    "#f5c451",
    padding
  );

  drawThresholdLine(
    ctx,
    width,
    height,
    CONFIG.HIGH_THRESHOLD,
    "#ef4444",
    padding
  );

  /*
    ----------------------------------------------------------
    BUILD DATA POINTS
    ----------------------------------------------------------
  */

  const points = state.history
    .filter(item =>
      Number.isFinite(item.bpm) &&
      item.bpm > 0
    )
    .map((item, index, arr) => {

      const x =
        arr.length === 1
          ? padding.left + graphWidth / 2
          : padding.left +
            (index / (arr.length - 1)) *
            graphWidth;

      return {
        x,
        y: getY(item.bpm),
        bpm: item.bpm
      };
    });

  if (!points.length) return;

  /*
    ----------------------------------------------------------
    GRAPH COLOR
    ----------------------------------------------------------
    
    IMPORTANT:
    Your existing NORMAL = green
    Your existing ALERT = red
  */

  const isNormal =
    state.status === "NORMAL";

  const lineColor =
    isNormal
      ? "#39d98a"
      : "#ef4444";

  const glowColor =
    isNormal
      ? "rgba(57,217,138,.45)"
      : "rgba(239,68,68,.45)";

  /*
    ----------------------------------------------------------
    AREA FILL
    ----------------------------------------------------------
  */

  const gradient =
    ctx.createLinearGradient(
      0,
      padding.top,
      0,
      padding.top + graphHeight
    );

  if (isNormal) {

    gradient.addColorStop(
      0,
      "rgba(57,217,138,.16)"
    );

    gradient.addColorStop(
      1,
      "rgba(57,217,138,0)"
    );

  } else {

    gradient.addColorStop(
      0,
      "rgba(239,68,68,.16)"
    );

    gradient.addColorStop(
      1,
      "rgba(239,68,68,0)"
    );
  }

  /*
    Build smooth curve.
  */

  function buildTrendPath() {

    ctx.beginPath();

    points.forEach((point, index) => {

      if (index === 0) {

        ctx.moveTo(
          point.x,
          point.y
        );

        return;
      }

      const previous =
        points[index - 1];

      const midpoint =
        (previous.x + point.x) / 2;

      ctx.quadraticCurveTo(
        previous.x,
        previous.y,
        midpoint,
        (previous.y + point.y) / 2
      );

      ctx.quadraticCurveTo(
        point.x,
        point.y,
        point.x,
        point.y
      );
    });
  }

  /*
    ----------------------------------------------------------
    AREA
    ----------------------------------------------------------
  */

  buildTrendPath();

  ctx.lineTo(
    points[points.length - 1].x,
    padding.top + graphHeight
  );

  ctx.lineTo(
    points[0].x,
    padding.top + graphHeight
  );

  ctx.closePath();

  ctx.fillStyle = gradient;

  ctx.fill();

  /*
    ----------------------------------------------------------
    MAIN TREND LINE
    ----------------------------------------------------------
  */

  buildTrendPath();

  ctx.save();

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.shadowBlur = 10;
  ctx.shadowColor = glowColor;

  ctx.stroke();

  ctx.restore();

  /*
    ----------------------------------------------------------
    LATEST DATA POINT
    ----------------------------------------------------------
  */

  const latest =
    points[points.length - 1];

  ctx.beginPath();

  ctx.arc(
    latest.x,
    latest.y,
    4,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = lineColor;

  ctx.shadowBlur = 12;
  ctx.shadowColor = glowColor;

  ctx.fill();

  ctx.shadowBlur = 0;

  /*
    ----------------------------------------------------------
    CURRENT BPM LABEL
    ----------------------------------------------------------
  */

  ctx.save();

  ctx.font =
    "600 9px Inter, sans-serif";

  ctx.textAlign = "right";

  ctx.fillStyle =
    isNormal
      ? "#8ff0bc"
      : "#fca5a5";

  ctx.fillText(
  `${dashboardBPM.toFixed(1)} BPM`,
  width - padding.right,
  padding.top + 5
);

  ctx.restore();
}

  /* ----------------------------------------------------------
     THRESHOLD LINES
  ---------------------------------------------------------- */

  drawThresholdLine(
    ctx,
    width,
    height,
    CONFIG.LOW_THRESHOLD,
    "#f5c451",
    padding
  );

  drawThresholdLine(
    ctx,
    width,
    height,
    CONFIG.HIGH_THRESHOLD,
    "#ef4444",
    padding
  );


  /* ----------------------------------------------------------
     BUILD POINTS
  ---------------------------------------------------------- */

  const points = state.history
    .filter(
      item =>
        Number.isFinite(item.bpm) &&
        item.bpm > 0
    )
    .map((item, index, arr) => {

      const x =
        arr.length === 1
          ? padding.left + graphWidth / 2
          : padding.left +
            (index / (arr.length - 1)) *
              graphWidth;

      return {
        x,
        y: getY(item.bpm),
        bpm: item.bpm
      };
    });


  if (!points.length) return;


  /* ----------------------------------------------------------
     AREA FILL
  ---------------------------------------------------------- */

  const gradient =
    ctx.createLinearGradient(
      0,
      padding.top,
      0,
      padding.top + graphHeight
    );

  const isNormal =
    state.status === "NORMAL";

  if (isNormal) {

    gradient.addColorStop(
      0,
      "rgba(57,217,138,.18)"
    );

    gradient.addColorStop(
      1,
      "rgba(57,217,138,0)"
    );

  } else {

    gradient.addColorStop(
      0,
      "rgba(239,68,68,.18)"
    );

    gradient.addColorStop(
      1,
      "rgba(239,68,68,0)"
    );
  }


  ctx.beginPath();

  points.forEach((point, index) => {

    if (index === 0) {

      ctx.moveTo(
        point.x,
        point.y
      );

    } else {

      /*
        Smooth-ish curve using quadratic
        interpolation between telemetry points.
      */

      const previous =
        points[index - 1];

      const midpoint =
        (previous.x + point.x) / 2;

      ctx.quadraticCurveTo(
        previous.x,
        previous.y,
        midpoint,
        (previous.y + point.y) / 2
      );

      ctx.quadraticCurveTo(
        point.x,
        point.y,
        point.x,
        point.y
      );
    }
  });

  ctx.lineTo(
    points[points.length - 1].x,
    padding.top + graphHeight
  );

  ctx.lineTo(
    points[0].x,
    padding.top + graphHeight
  );

  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();


  /* ----------------------------------------------------------
     MAIN BPM LINE
  ---------------------------------------------------------- */

  ctx.beginPath();

  points.forEach((point, index) => {

    if (index === 0) {

      ctx.moveTo(
        point.x,
        point.y
      );

    } else {

      const previous =
        points[index - 1];

      const midpoint =
        (previous.x + point.x) / 2;

      ctx.quadraticCurveTo(
        previous.x,
        previous.y,
        midpoint,
        (previous.y + point.y) / 2
      );

      ctx.quadraticCurveTo(
        point.x,
        point.y,
        point.x,
        point.y
      );
    }
  });


  const lineColor =
    isNormal
      ? "#39d98a"
      : "#ef4444";

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.shadowBlur = 10;

  ctx.shadowColor =
    isNormal
      ? "rgba(57,217,138,.45)"
      : "rgba(239,68,68,.45)";

  ctx.stroke();

  ctx.shadowBlur = 0;


  /* ----------------------------------------------------------
     LIVE DATA POINTS
  ---------------------------------------------------------- */

  points.forEach((point, index) => {

    /*
      Only highlight the newest point.
    */

    if (
      index !== points.length - 1
    ) {
      return;
    }

    ctx.beginPath();

    ctx.arc(
      point.x,
      point.y,
      4,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = lineColor;

    ctx.shadowBlur = 12;

    ctx.shadowColor = lineColor;

    ctx.fill();

    ctx.shadowBlur = 0;
  });


  /* ----------------------------------------------------------
     CURRENT BPM LABEL
  ---------------------------------------------------------- */

  const latest =
    points[points.length - 1];

  ctx.save();

  ctx.font =
    "600 9px Inter, sans-serif";

  ctx.textAlign = "right";

  ctx.fillStyle =
    isNormal
      ? "#8ff0bc"
      : "#fca5a5";

  ctx.fillText(
    `${latest.bpm.toFixed(1)} BPM`,
    width - padding.right,
    padding.top + 5
  );

  ctx.restore();



/* ============================================================
   THRESHOLD LINE
   ============================================================ */

function drawThresholdLine(
  ctx,
  width,
  height,
  bpm,
  color,
  padding
) {

  const minBpm = 40;
  const maxBpm = 150;

  const graphHeight =
    height -
    padding.top -
    padding.bottom;

  const normalized =
    (bpm - minBpm) /
    (maxBpm - minBpm);

  const y =
    padding.top +
    graphHeight -
    Math.max(
      0,
      Math.min(1, normalized)
    ) * graphHeight;


  ctx.save();

  ctx.beginPath();

  ctx.moveTo(
    padding.left,
    y
  );

  ctx.lineTo(
    width - padding.right,
    y
  );

  ctx.setLineDash([5, 5]);

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;

  ctx.stroke();

  ctx.restore();
}

/* ============================================================
   EVENT SYSTEM
   ============================================================ */

function addEvent(title, description, type = "normal") {
  const list = $("eventList");

  if (!list) return;

  const item = document.createElement("div");

  item.className = "event-item";

  item.innerHTML = `
    <span class="event-icon ${type === "alert" ? "alert" : ""}">
      ${type === "alert" ? "!" : "✓"}
    </span>

    <div>
      <strong>${escapeHTML(title)}</strong>
      <small>${escapeHTML(description)}</small>
    </div>

    <time>now</time>
  `;

  list.prepend(item);

  /*
    Keep the event stream compact.
  */

  while (list.children.length > 30) {
    list.removeChild(list.lastElementChild);
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ============================================================
   TELEMETRY FETCH
   ============================================================ */

async function fetchTelemetry() {
  try {
    const response = await fetch(
      CONFIG.API_URL,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data = await response.json();

    // ==========================================
// SIDEBAR SYSTEM STATUS
// ==========================================

const sidebarStatus =
  document.getElementById("sidebarSystemStatus");

const sidebarTitle =
  document.getElementById("sidebarSystemTitle");

const sidebarMeta =
  document.getElementById("sidebarSystemMeta");

const sidebarProgress =
  document.getElementById("sidebarProgress");

if (sidebarStatus) {
  sidebarStatus.textContent = "SYSTEM ONLINE";
}

if (sidebarTitle) {
  sidebarTitle.textContent = "Monitoring active";
}

if (sidebarMeta) {
  sidebarMeta.textContent = "ESP32 / Wokwi simulation";
}

if (sidebarProgress) {
  sidebarProgress.style.width = "100%";
}

    processTelemetry(data);

  } catch (error) {
    /*
      Do NOT display fake telemetry.

      The dashboard simply shows that the bridge is
      unavailable.
    */

    if (state.connected) {
      state.connected = false;

      updateConnectionUI();

      addEvent(
        "Telemetry connection lost",
        "Waiting for the Wokwi bridge to reconnect.",
        "alert"
      );
    }
  }
}

/* ============================================================
   SEARCH
   ============================================================ */

function initializeSearch() {
  const input = $("searchInput");

  if (!input) return;

  input.addEventListener("input", () => {
    const query =
      input.value.trim().toLowerCase();

    document
      .querySelectorAll(".event-item")
      .forEach((item) => {
        const text =
          item.textContent.toLowerCase();

        item.style.display =
          !query || text.includes(query)
            ? ""
            : "none";
      });
  });
}

/* ============================================================
   MOBILE SIDEBAR
   ============================================================ */

function initializeMobileMenu() {
  const button = $("menuBtn");
  const sidebar = $("sidebar");

  if (!button || !sidebar) return;

  button.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  document
    .querySelectorAll(".nav-item")
    .forEach((item) => {
      item.addEventListener("click", () => {
        sidebar.classList.remove("open");
      });
    });
}

/* ============================================================
   CLEAR BUTTONS
   ============================================================ */

function initializeControls() {
  const clearChart = $("clearChart");

  if (clearChart) {
    clearChart.addEventListener("click", () => {
      state.history = [];

      drawWaveform();
      drawTrendChart();

      addEvent(
        "Chart cleared",
        "Telemetry history visualization reset."
      );
    });
  }

  const clearEvents = $("clearEvents");

  if (clearEvents) {
    clearEvents.addEventListener("click", () => {
      const list = $("eventList");

      if (list) {
        list.innerHTML = "";
      }
    });
  }

  const notifyButton = $("notifyBtn");

  if (notifyButton) {
    notifyButton.addEventListener("click", () => {
      showToast(
        isAlert()
          ? "Heartbeat alert active"
          : "No active alerts",
        isAlert()
          ? "Check the live BPM telemetry."
          : "System is currently clear."
      );
    });
  }
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(title, message) {
  const container = $("toastContainer");

  if (!container) return;

  const toast = document.createElement("div");

  toast.className = "toast";

  toast.innerHTML = `
    <strong>${escapeHTML(title)}</strong>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/* ============================================================
   RESIZE
   ============================================================ */

function initializeResize() {
  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      drawWaveform();
      drawTrendChart();
    }, 150);
  });
}

/* ============================================================
   TELEMETRY BRIDGE
   ============================================================ */

function initializeTelemetry() {
  /*
    The frontend attempts to read the backend/bridge.

    It does NOT create artificial BPM values.

    Your ESP32/Wokwi output should eventually reach:

    GET http://localhost:3000/api/telemetry

    Example payload:

    {
      "bpm": 73.4,
      "simulated_bpm": 73.4,
      "status": "NORMAL",
      "alert": false,
      "sensor_raw": 1245,
      "uptime_ms": 15289
    }
  */

  fetchTelemetry();

  setInterval(
    fetchTelemetry,
    CONFIG.POLL_INTERVAL
  );
}

/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeUI() {
  resetDashboard();

  initializeSearch();
  initializeMobileMenu();
  initializeControls();
  initializeResize();

  addEvent(
    "Dashboard initialized",
    "Live ESP32/Wokwi telemetry."
  );

  initializeTelemetry();
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  initializeUI
);