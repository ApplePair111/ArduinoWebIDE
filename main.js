const GITHUB_REPO = "ApplePair111/ArduinoWebIDE";
const VERCEL_API_TRIGGER = "https://arduino-web-ide.vercel.app/api/trigger";
const ARTIFACT_POLL_API = "https://arduino-web-ide.vercel.app/api/artifact";

let hexData = null;
let selectedPort = null;

const logBox = document.getElementById("log");
const uploadBtn = document.getElementById("upload-btn");
const selectPortBtn = document.getElementById("select-port-btn");

uploadBtn.disabled = true;

function log(...args) {
  const line = args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ");
  if (logBox) {
    logBox.textContent += line + "\n";
    logBox.scrollTop = logBox.scrollHeight;
  }
  console.log(...args);
}

// Patch version.txt error in avrdude.js
const originalFetch = window.fetch;
window.fetch = async function (url, ...args) {
  if (typeof url === "string" && url.includes("version.txt")) {
    return new Response("0.0.3", { status: 200 });
  }
  return originalFetch(url, ...args);
};

selectPortBtn.addEventListener("click", async () => {
  try {
    log("[🔌] Requesting serial port...");
    selectedPort = await navigator.serial.requestPort();
    await selectedPort.open({ baudRate: 115200 });
    log("[✅] Serial port selected");
  } catch (err) {
    log("[❌] Could not open port: " + err.message);
  }
});

uploadBtn.addEventListener("click", async () => {
  if (!selectedPort || !hexData) {
    alert("Select port and compile sketch first!");
    return;
  }

  try {
    log("[⬆️] Uploading via avrdude.js...");
    const Avrdude = (await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs")).SerialPort;
    const programmer = new Avrdude(selectedPort);

    await programmer.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });

    log("[✅] Upload complete!");
    alert("✅ Done!");
  } catch (err) {
    log("[❌] Upload failed: " + err.message);
  }
});

async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));
  log("[📤] Sketch encoded to base64");

  log("[🚀] Sending to Vercel...");
  const res = await fetch(VERCEL_API_TRIGGER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch: b64 })
  });

  if (!res.ok) {
    log("[❌] Trigger failed:", await res.text());
    alert("❌ Compile trigger failed.");
    return;
  }

  log("[✅] Triggered. Waiting for HEX...");

  const hex = await pollForHex();
  if (!hex) {
    log("[❌] No hex received.");
    return;
  }

  hexData = hex;
  uploadBtn.disabled = false;
  log("[🧠] HEX received. Ready to upload.");
}

async function pollForHex() {
  const timeout = Date.now() + 2 * 60 * 1000;
  while (Date.now() < timeout) {
    log("[🔁] Polling artifact API...");
    const res = await fetch(ARTIFACT_POLL_API);
    const data = await res.json();

    if (data.hex) {
      return data.hex;
    }

    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

// Attach compile button
document.getElementById("compile-btn").addEventListener("click", compileCode);
