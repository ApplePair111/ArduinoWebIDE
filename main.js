const GITHUB_REPO = "ApplePair111/ArduinoWebIDE";

async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `form.html?sketch=${encodeURIComponent(b64)}`;
  document.body.appendChild(iframe);

  alert("⏳ Compiling sketch on GitHub Actions...");

  const hexUrl = await waitForHexArtifact();
  if (!hexUrl) {
    alert("❌ Compile failed or timed out.");
    return;
  }

  const hexData = await fetch(hexUrl).then(r => r.text());
  await flashHex(hexData);
}

async function waitForHexArtifact() {
  const start = Date.now();
  while (Date.now() - start < 120000) {
    const runsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs`);
    const runs = await runsRes.json();
    if (runs.workflow_runs && runs.workflow_runs.length > 0) {
      const latest = runs.workflow_runs[0];
      if (latest.status === "completed" && latest.conclusion === "success") {
        const artifactsRes = await fetch(latest.artifacts_url);
        const artifacts = await artifactsRes.json();
        const artifact = artifacts.artifacts.find(a => a.name === "compiled-hex");
        if (artifact) return artifact.archive_download_url;
      }
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

async function flashHex(hexData) {
  const { SerialPort } = await import("https://cdn.jsdelivr.net/npm/avrdude.js@latest/dist/web/avrdude.bundle.mjs");
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    const avrdude = new SerialPort(port);
    await avrdude.flashHex(hexData, {
      mcu: "atmega328p",
      programmer: "arduino",
      baudrate: 115200
    });
    alert("✅ Upload complete!");
  } catch (e) {
    alert("❌ Upload failed: " + e.message);
  }
}
