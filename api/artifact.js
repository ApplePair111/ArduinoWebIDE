// api/artifact.js (CommonJS)
const inbox = new Map(); // key -> { hex?, status, error?, ts }
const TTL_MS = 15 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [k, v] of inbox.entries()) if (!v || now - v.ts > TTL_MS) inbox.delete(k);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Hook-Secret");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      if (req.headers["x-hook-secret"] !== process.env.HOOK_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { run_id, client_id, hex_b64, status, error } = body || {};
      if (!run_id && !client_id) return res.status(400).json({ error: "Missing run_id or client_id" });

      const rec = { ts: Date.now(), status: status || "unknown" };
      if (hex_b64) rec.hex = Buffer.from(hex_b64, "base64").toString("utf8");
      if (error)   rec.error = String(error);

      if (run_id)    inbox.set(String(run_id), rec);
      if (client_id) inbox.set(String(client_id), rec);

      cleanup();
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Server error" });
    }
  }

  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const runId    = url.searchParams.get("run_id");
    const clientId = url.searchParams.get("client_id");
    const key = clientId || runId;
    if (!key) return res.status(400).json({ error: "Missing run_id or client_id" });

    const rec = inbox.get(String(key));
    if (!rec) return res.status(404).json({ error: "Not ready" });

    return res.status(200).json({
      status: rec.status || "unknown",
      error:  rec.error  || null,
      hex:    rec.hex    || null
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
