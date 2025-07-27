let currentMode = "arduino";

// --- Switch between Arduino & Python ---
document.getElementById("modeSelector").addEventListener("change", e => {
  currentMode = e.target.value;
  const lang = currentMode === "python" ? "python" : "cpp";
  monaco.editor.setModelLanguage(editor.getModel(), lang);
});

// --- Compile Arduino Code via GitHub API ---
async function compileCode() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));

  alert("⏳ Uploading code to GitHub...");

  const response = await fetch("https://api.github.com/repos/your-user/your-repo/actions/workflows/compile-arduino.yml/dispatches", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_GITHUB_TOKEN",
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ref: "main",
      inputs: { sketch: b64 }
    })
  });

  if (response.ok) {
    alert("✅ Code uploaded! Wait ~30s then download .hex.");
    // Optionally poll for artifact URL...
  } else {
    alert("❌ Compile request failed");
    console.error(await response.text());
  }
}

// --- Upload HEX to Arduino using Web Serial + avrdude.js ---
async function uploadHex() {
  alert("📦 Select compiled .hex file to upload");
  const [fileHandle] = await window.showOpenFilePicker({ types: [{ accept: { "text/plain": [".hex"] } }] });
  const file = await fileHandle.getFile();
  const hexData = await file.text();

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

// --- Run Python Script via GitHub Actions ---
async function runPython() {
  const code = editor.getValue();
  const b64 = btoa(unescape(encodeURIComponent(code)));

  alert("🐍 Sending Python script to run...");

  const response = await fetch("https://api.github.com/repos/your-user/your-repo/actions/workflows/run-python.yml/dispatches", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_GITHUB_TOKEN",
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ref: "main",
      inputs: { script: b64 }
    })
  });

  if (response.ok) {
    alert("✅ Python script submitted. Check GitHub Action logs.");
  } else {
    alert("❌ Python run failed");
    console.error(await response.text());
  }
}
