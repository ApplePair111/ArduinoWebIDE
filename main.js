// =========================
// CONFIG
// =========================
const VERCEL_BASE_URL = "https://arduino-web-ide.vercel.app"; // <-- CHANGE THIS
const VERCEL_TRIGGER_URL  = `${VERCEL_BASE_URL}/api/trigger`;
const VERCEL_ARTIFACT_URL = `${VERCEL_BASE_URL}/api/artifact`;

// Workflow/run names expected by your backend:
// - trigger.js expects { sketch: "<base64>" }
// - artifact.js returns { hex: "<intel-hex-text>" }

// =========================
// UI LOGGING (works on iPad)
// =========================
function log(...args) {
  const line = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  const box = document.getElementById("log");
  if (box) {
    box.textContent += line + "\n";
    box.scrollTop = box.scrollHeight;
  }
  // Also mirror to console (helps on desktop)
  try { console.log(...args); } catch (_) {}
}

// Small helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// =========================
// MAIN FLOW
// =========================
async function compileCode() {
  try {
    if (!window.editor || typeof window.editor.getValue !== "function") {
      alert("Monaco editor not found (window.editor).");
      return;
    }

    const code = window.editor.getValue();
    if (!code || !code.trim()) {
      alert("Sketch is empty.");
      return;
    }

    // Encode as UTF-8 → base64 (safe for non-ASCII)
    const b64 = btoa(unescape(encodeURIComponent(code)));
    log(`[📤] Sketch encoded (length: ${b64.length}).`);

    // 1) Trigger the GitHub Action via Vercel
    log("[🚀] Triggering workflow on Vercel…");
    const trigRes = await fetch(VERCEL_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ sketch: b64 })
    });

    const trigText = await trigRes.text();
    if (!trigRes.ok) {
      log(`[❌] Trigger failed (${trigRes.status}):`, trigText);
      alert("Trigger failed. Check logs.");
      return;
    }
    log("[✅] Workflow triggered. Waiting for HEX (~1 min)…");

    // 2) Poll Vercel artifact endpoint until it returns the HEX
    const hex = await waitForHexFromVercel({ timeoutMs: 2 * 60 * 1000, intervalMs: 4000 });
    if (!hex) {
      log("[❌] HEX not received within timeout.");
      alert("HEX not ready (timed out).");
      return;
    }

    log(`[📦] HEX received (length: ${hex.length}).`);
    // 3) Flash to board via Web Serial
    await flashHex(hex);
  } catch (err) {
    log("[💥] Unexpected error:", err && err.message ? err.message : String(err));
    alert("Unexpected error. See logs.");
  }
}

// Polls the artifact endpoint until HEX is returned or timeout reached
async function waitForHexFromVercel({ timeoutMs = 120000, intervalMs = 4000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      log("[🔁] Asking Vercel for artifact…");
      const res = await fetch(VERCEL_ARTIFACT_URL, { method: "GET", headers: { "Accept": "application/json" } });
      const text = await res.text();

      // Try JSON parse safely
      let json = null;
      try { json = JSON.parse(text); } catch (_) { /* ignore */ }

      if (res.ok && json && typeof json.hex === "string" && json.hex.length > 0) {
        return json.hex; // 🎯 Got the HEX
      }

      // Handle "not ready" responses gracefully
      if (res.status === 408 || (json && json.error && /not ready|timeout/i.test(json.error))) {
        log("[⏳] Artifact not ready yet; will retry…");
      } else {
        // Other errors (404, 500, etc.) – show detail but continue polling a bit
        log(`[⚠️] Artifact endpoint replied ${res.status}:`, text);
      }
    } catch (e) {
      log("[⚠️] Artifact request error:", e.message || String(e));
      // Keep polling; transient issues happen
    }

    await sleep(intervalMs);
  }
  return null;
}

// =========================
// FLASH VIA WEB SERIAL
// =========================
async function flashHex(hexData) {
  try {
    if (!("serial" in navigator)) {
      alert("Web Serial API not supported in this browser.");
      log("[❌] navigator.serial not available.");
      return;
    }

    log("[🔌] Requesting serial port…");
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    log("[⚙️] Importing avrdude.js and uploading…");
    const AvrdudeMod = await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs");
    const Programmer = AvrdudeMod.SerialPort;
    const programmer = new Programmer(port);

    // Default: Arduino Uno bootloader @ 115200, mcu atmega328p
    await programmer.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });

    log("[✅] Upload complete!");
    alert("✅ Upload complete!");
    try { await port.close(); } catch (_) {}
  } catch (err) {
    log("[❌] Upload failed:", err && err.message ? err.message : String(err));
    alert("Upload failed. See logs.");
  }
}

// =========================
// WIRE UP UI
// =========================
// Call this once your page loads and Monaco is ready.
// If your button has id="runBtn", this attaches the click handler.
(function attachHandler() {
  const btn = document.getElementById("runBtn");
  if (btn) {
    btn.addEventListener("click", compileCode);
    log("[🧩] main.js ready. Click 'Build/Upload' to start.");
  } else {
    // If you don't have a button, expose the function globally
    window.compileCode = compileCode;
    log("[🧩] main.js ready. Call window.compileCode() to start.");
  }
})();
