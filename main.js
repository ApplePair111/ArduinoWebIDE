const GITHUB_REPO = "ApplePair111/ArduinoWebIDE";

async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));
  console.log("[📤] Base64 sketch:", b64);

  // Step 1: Dispatch GitHub Action with dynamic form
  console.log("[🧾] Creating form and submitting sketch to GitHub Actions...");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `https://github.com/${GITHUB_REPO}/actions/workflows/compile-arduino.yml/dispatches`;
  form.target = "_blank"; // can be "_self" or omitted for silent

  const ref = document.createElement("input");
  ref.name = "ref";
  ref.value = "main";
  form.appendChild(ref);

  const sketchInput = document.createElement("input");
  sketchInput.name = "inputs[sketch]";
  sketchInput.value = b64;
  form.appendChild(sketchInput);

  document.body.appendChild(form);
  form.submit();
  form.remove();

  alert("⏳ Sent sketch to GitHub. Waiting for compile...");

  // Step 2: Wait for .hex artifact
  const zipUrl = await waitForHexArtifact();
  if (!zipUrl) {
    alert("❌ Timed out or failed.");
    return;
  }

  // Step 3: Download and unzip the .hex
  const hex = await fetchHexFromZip(zipUrl);
  if (!hex) {
    alert("❌ Could not extract .hex.");
    return;
  }

  // Step 4: Flash via Web Serial
  await flashHex(hex);
}

async function waitForHexArtifact() {
  console.log("[🔁] Polling GitHub Actions for latest run...");
  const timeout = Date.now() + 2 * 60 * 1000;
  while (Date.now() < timeout) {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs`);
    const data = await res.json();
    console.log("[📡] Fetched workflow runs:", data);

    const run = data.workflow_runs?.find(r => r.name === "Compile Arduino Sketch");
    if (run && run.status === "completed" && run.conclusion === "success") {
      const art = await fetch(run.artifacts_url).then(r => r.json());
      console.log("[📦] Fetched artifacts:", art);
      const found = art.artifacts.find(a => a.name === "compiled-hex");
      if (found) return found.archive_download_url;
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

async function fetchHexFromZip(url) {
  console.log("[⬇️] Downloading artifact .zip...");
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  const blob = await res.blob();
  const zipData = await blob.arrayBuffer();
  const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
  const zip = await JSZip.loadAsync(zipData);

  for (const name of Object.keys(zip.files)) {
    console.log("[🗂] Found file in zip:", name);
    if (name.endsWith(".hex")) {
      const hex = await zip.files[name].async("text");
      return hex;
    }
  }
  return null;
}

async function flashHex(hexData) {
  try {
    console.log("[🔌] Requesting serial port...");
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    console.log("[🚀] Flashing .hex to Arduino...");
    const Avrdude = (await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs")).SerialPort;
    const programmer = new Avrdude(port);

    await programmer.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });

    alert("✅ Upload complete!");
    console.log("[✅] Upload successful");
  } catch (err) {
    console.error("[❌] Upload failed:", err);
    alert("❌ Upload failed: " + err.message);
  }
}
const GITHUB_REPO = "ApplePair111/ArduinoWebIDE"; // ← CHANGE THIS

async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));

  // Step 1: Trigger GitHub Action via form.html
  const iframe = document.createElement("iframe");
  iframe.name = "gh-form-frame";
  iframe.style.display = "none";
  iframe.src = "form.html";
  document.body.appendChild(iframe);

  iframe.onload = () => {
    console.log("[📨] Sending sketch via postMessage...");
    iframe.contentWindow.postMessage({ sketch: b64 }, "*");
  };

  alert("⏳ Sent sketch to GitHub… waiting for compile.");

  // Step 2: Poll until the .hex artifact is ready
  const zipUrl = await waitForHexArtifact();
  if (!zipUrl) return alert("❌ Timed out or failed.");

  // Step 3: Fetch and unzip the .hex
  const hex = await fetchHexFromZip(zipUrl);
  if (!hex) return alert("❌ Failed to extract .hex.");

  // Step 4: Flash to Arduino via Web Serial
  await flashHex(hex);
}

// Waits for successful run and returns artifact URL
async function waitForHexArtifact() {
  const timeout = Date.now() + 2 * 60 * 1000;
  while (Date.now() < timeout) {
    const runsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs`);
    const runs = await runsRes.json();
    const run = runs.workflow_runs?.find(r => r.name === "Compile Arduino Sketch");
    if (run && run.status === "completed" && run.conclusion === "success") {
      const artifacts = await fetch(run.artifacts_url).then(r => r.json());
      const artifact = artifacts.artifacts.find(a => a.name === "compiled-hex");
      if (artifact) return artifact.archive_download_url;
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

// Downloads .zip from GitHub and extracts compiled.hex
async function fetchHexFromZip(url) {
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  const blob = await res.blob();
  const zipData = await blob.arrayBuffer();
  const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
  const zip = await JSZip.loadAsync(zipData);

  for (const name of Object.keys(zip.files)) {
    if (name.endsWith(".hex")) {
      return await zip.files[name].async("text");
    }
  }
  return null;
}

// Flashes the .hex to connected Arduino using Web Serial
async function flashHex(hexData) {
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    const Avrdude = (await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs")).SerialPort;
    const programmer = new Avrdude(port);

    await programmer.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });

    alert("✅ Upload complete!");
  } catch (err) {
    alert("❌ Upload failed: " + err.message);
  }
}
