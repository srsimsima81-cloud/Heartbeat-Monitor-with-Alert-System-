#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

// ============================================================
// HEARTBEAT MONITOR WITH ALERT SYSTEM
// Advanced Embedded Systems Virtual Prototype
//
// ESP32
// OLED
// Potentiometer = virtual pulse-rate control
// Green LED = normal
// Red LED = alert
// Buzzer = alert
//
// Frontend Integration:
// Serial JSON telemetry
// ============================================================

// ============================================================
// PIN CONFIGURATION
// ============================================================

#define PULSE_INPUT 34

#define GREEN_LED 25
#define RED_LED   26
#define BUZZER    27

#define OLED_SDA 21
#define OLED_SCL 22

// ============================================================
// OLED CONFIGURATION
// ============================================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

Adafruit_SSD1306 display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  OLED_RESET
);

// ============================================================
// HEART RATE CONFIGURATION
// ============================================================

// Educational demonstration thresholds

const int LOW_THRESHOLD = 60;
const int HIGH_THRESHOLD = 100;

// BPM limits for simulation

const float MIN_SIM_BPM = 40.0;
const float MAX_SIM_BPM = 150.0;

// ============================================================
// BPM PROCESSING
// ============================================================

#define BPM_BUFFER_SIZE 8

float bpmBuffer[BPM_BUFFER_SIZE];

int bpmBufferIndex = 0;
int bpmBufferCount = 0;

float measuredBPM = 0;

// ============================================================
// HEARTBEAT TIMING
// ============================================================

unsigned long lastBeatTime = 0;

bool previousBeat = false;

const unsigned long MIN_BEAT_INTERVAL = 300;
const unsigned long MAX_BEAT_INTERVAL = 2000;

// ============================================================
// SIMULATION
// ============================================================

float simulatedBPM = 75.0;

int potentiometerValue = 0;

// ============================================================
// STATUS
// ============================================================

enum HeartStatus {

  STATUS_NO_SIGNAL,

  STATUS_LOW,

  STATUS_NORMAL,

  STATUS_HIGH
};

HeartStatus currentStatus =
  STATUS_NO_SIGNAL;

// ============================================================
// TIMERS
// ============================================================

unsigned long lastDisplayUpdate = 0;

unsigned long lastTelemetryUpdate = 0;

unsigned long lastBPMControlUpdate = 0;

const unsigned long DISPLAY_INTERVAL = 250;

const unsigned long TELEMETRY_INTERVAL = 500;

const unsigned long BPM_CONTROL_INTERVAL = 100;

// ============================================================
// STATUS TEXT
// ============================================================

const char* getStatusText() {

  switch (currentStatus) {

    case STATUS_LOW:
      return "LOW";

    case STATUS_NORMAL:
      return "NORMAL";

    case STATUS_HIGH:
      return "HIGH";

    default:
      return "NO_SIGNAL";
  }
}

// ============================================================
// ADD BPM TO BUFFER
// ============================================================

void addBPM(float bpm) {

  bpmBuffer[bpmBufferIndex] =
    bpm;

  bpmBufferIndex++;

  if (
    bpmBufferIndex >=
    BPM_BUFFER_SIZE
  ) {

    bpmBufferIndex = 0;
  }

  if (
    bpmBufferCount <
    BPM_BUFFER_SIZE
  ) {

    bpmBufferCount++;
  }
}

// ============================================================
// CALCULATE MOVING AVERAGE
// ============================================================

float calculateAverageBPM() {

  if (bpmBufferCount == 0) {

    return 0;
  }

  float total = 0;

  for (
    int i = 0;
    i < bpmBufferCount;
    i++
  ) {

    total += bpmBuffer[i];
  }

  return total /
         bpmBufferCount;
}

// ============================================================
// READ POTENTIOMETER
// ============================================================

void updateSimulationBPM() {

  potentiometerValue =
    analogRead(PULSE_INPUT);

  // Map potentiometer to
  // 40 - 150 BPM

  simulatedBPM =
    MIN_SIM_BPM +
    (
      (float)potentiometerValue /
      4095.0
    ) *
    (
      MAX_SIM_BPM -
      MIN_SIM_BPM
    );
}

// ============================================================
// GENERATE VIRTUAL HEARTBEAT
// ============================================================

bool generateHeartbeat() {

  float beatInterval =
    60000.0 /
    simulatedBPM;

  float position =
    fmod(
      (float)millis(),
      beatInterval
    );

  // Simulated pulse width

  if (position < 70) {

    return true;
  }

  return false;
}

// ============================================================
// HEARTBEAT DETECTION
// ============================================================

void processHeartbeat() {

  bool beat =
    generateHeartbeat();

  // Rising edge detection

  if (
    beat &&
    !previousBeat
  ) {

    unsigned long now =
      millis();

    // First beat

    if (
      lastBeatTime == 0
    ) {

      lastBeatTime = now;

      Serial.println(
        "First heartbeat detected"
      );
    }

    else {

      unsigned long interval =
        now -
        lastBeatTime;

      // Reject impossible intervals

      if (
        interval >=
        MIN_BEAT_INTERVAL &&
        interval <=
        MAX_BEAT_INTERVAL
      ) {

        float instantBPM =
          60000.0 /
          interval;

        addBPM(
          instantBPM
        );

        measuredBPM =
          calculateAverageBPM();
      }

      lastBeatTime = now;
    }
  }

  previousBeat =
    beat;
}

// ============================================================
// STATUS CLASSIFICATION
// ============================================================

void updateStatus() {

  if (
    measuredBPM <= 0
  ) {

    currentStatus =
      STATUS_NO_SIGNAL;

    return;
  }

  if (
    measuredBPM <
    LOW_THRESHOLD
  ) {

    currentStatus =
      STATUS_LOW;
  }

  else if (
    measuredBPM >
    HIGH_THRESHOLD
  ) {

    currentStatus =
      STATUS_HIGH;
  }

  else {

    currentStatus =
      STATUS_NORMAL;
  }
}

// ============================================================
// ALERT SYSTEM
// ============================================================

void updateAlerts() {

  // NORMAL

  if (
    currentStatus ==
    STATUS_NORMAL
  ) {

    digitalWrite(
      GREEN_LED,
      HIGH
    );

    digitalWrite(
      RED_LED,
      LOW
    );

    noTone(
      BUZZER
    );
  }

  // LOW / HIGH

  else if (
    currentStatus ==
    STATUS_LOW ||
    currentStatus ==
    STATUS_HIGH
  ) {

    digitalWrite(
      GREEN_LED,
      LOW
    );

    digitalWrite(
      RED_LED,
      HIGH
    );

    // Pulsing alarm

    if (
      (millis() / 300) % 2
    ) {

      tone(
        BUZZER,
        1000
      );
    }

    else {

      noTone(
        BUZZER
      );
    }
  }

  // NO SIGNAL

  else {

    digitalWrite(
      GREEN_LED,
      LOW
    );

    digitalWrite(
      RED_LED,
      LOW
    );

    noTone(
      BUZZER
    );
  }
}

// ============================================================
// OLED DISPLAY
// ============================================================

void updateDisplay() {

  display.clearDisplay();

  display.setTextColor(
    SSD1306_WHITE
  );

  // ---------------- TITLE ----------------

  display.setTextSize(1);

  display.setCursor(
    0,
    0
  );

  display.println(
    "HEARTBEAT MONITOR"
  );

  display.drawLine(
    0,
    10,
    127,
    10,
    SSD1306_WHITE
  );

  // ---------------- BPM ----------------

  display.setTextSize(2);

  display.setCursor(
    0,
    17
  );

  if (
    measuredBPM > 0
  ) {

    display.print(
      (int)measuredBPM
    );

    display.println(
      " BPM"
    );
  }

  else {

    display.println(
      "-- BPM"
    );
  }

  // ---------------- STATUS ----------------

  display.setTextSize(1);

  display.setCursor(
    0,
    43
  );

  display.print(
    "STATUS: "
  );

  display.println(
    getStatusText()
  );

  // ---------------- SIMULATION ----------------

  display.setCursor(
    0,
    55
  );

  display.print(
    "SIM:"
  );

  display.print(
    (int)simulatedBPM
  );

  display.print(
    " BPM"
  );

  display.display();
}

// ============================================================
// FRONTEND TELEMETRY
// ============================================================

void sendTelemetry() {

  bool alert =
    (
      currentStatus ==
      STATUS_LOW ||
      currentStatus ==
      STATUS_HIGH
    );

  // IMPORTANT:
  // Keep this JSON on ONE LINE.
  // Frontend can parse it directly.

  Serial.print("{");

  Serial.print(
    "\"bpm\":"
  );

  Serial.print(
    measuredBPM,
    1
  );

  Serial.print(",");

  Serial.print(
    "\"simulated_bpm\":"
  );

  Serial.print(
    simulatedBPM,
    1
  );

  Serial.print(",");

  Serial.print(
    "\"status\":\""
  );

  Serial.print(
    getStatusText()
  );

  Serial.print(
    "\","
  );

  Serial.print(
    "\"alert\":"
  );

  Serial.print(
    alert ? "true" : "false"
  );

  Serial.print(",");

  Serial.print(
    "\"sensor_raw\":"
  );

  Serial.print(
    potentiometerValue
  );

  Serial.print(",");

  Serial.print(
    "\"uptime_ms\":"
  );

  Serial.print(
    millis()
  );

  Serial.println(
    "}"
  );
}

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
    115200
  );

  // GPIO

  pinMode(
    PULSE_INPUT,
    INPUT
  );

  pinMode(
    GREEN_LED,
    OUTPUT
  );

  pinMode(
    RED_LED,
    OUTPUT
  );

  pinMode(
    BUZZER,
    OUTPUT
  );

  // I2C

  Wire.begin(
    OLED_SDA,
    OLED_SCL
  );

  // OLED

  if (
    !display.begin(
      SSD1306_SWITCHCAPVCC,
      OLED_ADDRESS
    )
  ) {

    Serial.println(
      "OLED initialization FAILED"
    );

    while (true) {

      delay(100);
    }
  }

  // Startup display

  display.clearDisplay();

  display.setTextColor(
    SSD1306_WHITE
  );

  display.setTextSize(1);

  display.setCursor(
    15,
    5
  );

  display.println(
    "ADVANCED EMBEDDED"
  );

  display.setCursor(
    25,
    22
  );

  display.println(
    "HEART MONITOR"
  );

  display.setCursor(
    30,
    42
  );

  display.println(
    "SYSTEM READY"
  );

  display.display();

  // Startup serial output

  Serial.println();
  Serial.println(
    "================================"
  );

  Serial.println(
    " HEARTBEAT MONITOR"
  );

  Serial.println(
    " FRONTEND TELEMETRY ENABLED"
  );

  Serial.println(
    "================================"
  );

  delay(1500);
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {

  unsigned long now =
    millis();

  // Update simulated heart rate
  // from potentiometer

  if (
    now -
    lastBPMControlUpdate >=
    BPM_CONTROL_INTERVAL
  ) {

    lastBPMControlUpdate =
      now;

    updateSimulationBPM();
  }

  // Process heartbeat

  processHeartbeat();

  // Determine status

  updateStatus();

  // Control physical outputs

  updateAlerts();

  // OLED

  if (
    now -
    lastDisplayUpdate >=
    DISPLAY_INTERVAL
  ) {

    lastDisplayUpdate =
      now;

    updateDisplay();
  }

  // Frontend telemetry

  if (
    now -
    lastTelemetryUpdate >=
    TELEMETRY_INTERVAL
  ) {

    lastTelemetryUpdate =
      now;

    sendTelemetry();
  }

  delay(5);
}