const GITHUB_REPO = "ApplePair111/ArduinoWebIDE"; // ← CHANGE THIS

async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));

  // Step 1: Trigger GitHub Action via form.html
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `form.html?sketch=${encodeURIComponent(b64)}`;
  document.body.appendChild(iframe);

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
