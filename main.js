const GITHUB_REPO = "ApplePair111/ArduinoWebIDE";
const VERCEL_API_TRIGGER = "https://arduino-web-ide.vercel.app/api/trigger";

function log(...args) {
  const line = args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ");
  const logBox = document.getElementById("log");
  if (logBox) {
    logBox.textContent += line + "\n";
    logBox.scrollTop = logBox.scrollHeight;
  }
  console.log(...args);
}

async function compileCode() {
  log("button pressed")
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));
  log("[📤] Sketch encoded to base64");

  // Step 1: POST to your Vercel API
  log("[🚀] Sending sketch to Vercel trigger API...");
  const res = await fetch(VERCEL_API_TRIGGER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch: b64 })
  });

  if (!res.ok) {
    log("[❌] Vercel trigger failed:", await res.text());
    alert("❌ Vercel trigger failed.");
    return;
  }

  log("[✅] GitHub Action triggered. Polling for result...");

  // Step 2: Wait for artifact
  const zipUrl = await waitForHexArtifact();
  if (!zipUrl) {
    log("[❌] No artifact found. Timeout.");
    alert("❌ Compile failed or timed out.");
    return;
  }

  log("[📦] Artifact zip URL: " + zipUrl);

  // Step 3: Download and extract HEX
  const hex = await fetchHexFromZip(zipUrl);
  if (!hex) {
    log("[❌] Could not extract .hex file");
    return;
  }

  log("[🧠] HEX file loaded. Length: " + hex.length + " bytes");

  // Step 4: Flash over serial
  await flashHex(hex);
}

async function waitForHexArtifact() {
  const timeout = Date.now() + 2 * 60 * 1000;
  while (Date.now() < timeout) {
    log("[🔁] Checking GitHub Actions for completed run...");
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs`);
    const data = await res.json();

    const run = data.workflow_runs?.find(r => r.name === "Compile Arduino Sketch");
    if (run && run.status === "completed" && run.conclusion === "success") {
      const art = await fetch(run.artifacts_url).then(r => r.json());
      const found = art.artifacts.find(a => a.name === "compiled-hex");
      if (found) return found.archive_download_url;
    }

    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

async function fetchHexFromZip(url) {
  log("[⬇️] Downloading .zip...");
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  const blob = await res.blob();
  const zipData = await blob.arrayBuffer();

  const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
  const zip = await JSZip.loadAsync(zipData);

  for (const name of Object.keys(zip.files)) {
    log("[🗂] Found file in zip: " + name);
    if (name.endsWith(".hex")) {
      return await zip.files[name].async("text");
    }
  }

  return null;
}

async function flashHex(hexData) {
  try {
    log("[🔌] Requesting serial port...");
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    log("[⚙️] Uploading .hex via avrdude.js...");
    const Avrdude = (await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs")).SerialPort;
    const programmer = new Avrdude(port);

    await programmer.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });

    log("[✅] Upload complete!");
    alert("✅ Upload complete!");
  } catch (err) {
    log("[❌] Upload failed:", err.message);
    alert("❌ Upload failed: " + err.message);
  }
}
