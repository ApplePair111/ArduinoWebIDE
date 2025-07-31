// api/artifact.js (CommonJS on Vercel)
// No JSZip used. The workflow posts HEX (base64) directly here.
// Browser polls this endpoint by run_id to retrieve the HEX.

// In-memory store: run_id -> { hex, ts }
const inbox = new Map();
const TTL_MS = 15 * 60 * 1000; // keep for 15 minutes

function cleanup() {
  const now = Date.now();
  for (const [key, rec] of inbox.entries()) {
    if (!rec || now - rec.ts > TTL_MS) inbox.delete(key);
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Hook-Secret");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Workflow -> POST { run_id, hex_b64 } with secret header
  if (req.method === "POST") {
    try {
      const secret = req.headers["x-hook-secret"];
      if (!secret || secret !== process.env.HOOK_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { run_id, hex_b64 } = body || {};
      if (!run_id || !hex_b64) {
        return res.status(400).json({ error: "Missing run_id or hex_b64" });
      }

      const hex = Buffer.from(hex_b64, "base64").toString("utf8");
      inbox.set(String(run_id), { hex, ts: Date.now() });
      cleanup();

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Server error" });
    }
  }

  // Browser -> GET ?run_id=...
  if (req.method === "GET") {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const runId = url.searchParams.get("run_id");
      if (!runId) {
        return res.status(400).json({ error: "Missing run_id" });
      }

      const rec = inbox.get(String(runId));
      if (!rec) {
        return res.status(404).json({ error: "Not ready" });
      }

      return res.status(200).json({ hex: rec.hex });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
