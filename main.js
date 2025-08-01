const VERCEL_BASE_URL = "https://arduino-web-ide.vercel.app";
const VERCEL_TRIGGER_URL  = `${VERCEL_BASE_URL}/api/trigger`;
const VERCEL_ARTIFACT_URL = `${VERCEL_BASE_URL}/api/artifact`;

function log(...a){const s=a.map(x=>typeof x==="object"?JSON.stringify(x):String(x)).join(" ");
  const el=document.getElementById("log"); if(el){el.textContent+=s+"\n"; el.scrollTop=el.scrollHeight;}
  try{console.log(...a);}catch{}
}

async function compileCode() {
  const code = window.editor.getValue();
  if (!code?.trim()) { alert("Sketch is empty."); return; }

  const sketchB64 = btoa(unescape(encodeURIComponent(code)));
  const clientId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now()+"-"+Math.random());

  log("[🚀] Triggering workflow… client_id=", clientId);

  // send both sketch and client_id
  const t = await fetch(VERCEL_TRIGGER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ sketch: sketchB64, client_id: clientId })
  });
  const tData = await t.json().catch(()=> ({}));
  if (!t.ok) { log("[❌] Trigger failed:", tData.error || tData); return; }

  log("[✅] Triggered. Waiting for HEX (~1 min)…");

  // poll by client_id (no run_id needed)
  const hex = await waitForHexByClientId(clientId);
  if (!hex) { log("[❌] HEX not ready (timed out/failed)"); return; }

  log("[✅] HEX received. Len:", hex.length);
  await flashHexAuto(hex);
}

async function waitForHexByClientId(clientId, timeoutMs=120000, intervalMs=3000){
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${VERCEL_ARTIFACT_URL}?client_id=${encodeURIComponent(clientId)}`);
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch {}

    if (res.ok && json) {
      if (json.status === "success" && typeof json.hex === "string") return json.hex;
      if (json.status === "failure" || json.error) { log("[❌] Build failed:", json.error || json.status); return null; }
      // status unknown/in-progress
    } else if (res.status === 404) {
      log("[⏳] Not ready yet…");
    } else {
      log(`[⚠️] artifact ${res.status}:`, txt);
    }
    await new Promise(r=>setTimeout(r, intervalMs));
  }
  return null;
}
async function flashHexAuto(hex) {
  // Automatically select the first available serial port
  const ports = await navigator.serial.getPorts();
  const port = ports[0] || await navigator.serial.requestPort();
  if (!port.readable) {
    await port.open({ baudRate: 115200 });
  }
  const origFetch = window.fetch;
  window.fetch = async function (url, ...args) {
    if (url.includes("version.txt")) {
      return new Response("0.0.3");
    }
    return origFetch(url, ...args);
  };
  const Avrdude = (await import("https://cdn.jsdelivr.net/npm/avrdude.js@0.0.3/dist/web/avrdude.bundle.mjs")).SerialPort;
  const programmer = new Avrdude(port);

  await programmer.flashHex(hex, {
    mcu: "atmega328p",
    programmer: "arduino",
    baudrate: 115200
  });
}
