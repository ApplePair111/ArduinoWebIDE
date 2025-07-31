// This is to be posted to Vercel Backend :)

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { sketch, client_id } = body || {};
    if (!sketch) return res.status(400).json({ error: "Missing sketch" });

    const owner = "ApplePair111";
    const repo  = "ArduinoWebIDE";
    const token = process.env.GITHUB_TOKEN;

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/main.yml/dispatches`;
    const ghRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { sketch, client_id: client_id || "" } }),
    });

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: "GitHub trigger failed", details: await ghRes.text() });
    }
    // No need to return run_id anymore
    return res.status(200).json({ status: "Workflow triggered", client_id: client_id || null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
