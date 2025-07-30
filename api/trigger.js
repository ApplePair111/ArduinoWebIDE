// This is to be posted to Vercel Backend :)

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Vercel sometimes gives string body depending on framework/build
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { sketch } = body || {};
    if (!sketch) return res.status(400).json({ error: "Missing 'sketch'" });

    const url = "https://api.github.com/repos/ApplePair111/ArduinoWebIDE/actions/workflows/main.yml/dispatches";
    const gh = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ref: "main", inputs: { sketch } })
    });

    const text = await gh.text();
    if (!gh.ok) return res.status(gh.status).json({ error: "GitHub API error", details: text });

    return res.status(200).json({ ok: true, message: "workflow_dispatch sent" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
