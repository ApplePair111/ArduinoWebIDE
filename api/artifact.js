const JSZip = require("jszip");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const owner = "ApplePair111";
  const repo  = "ArduinoWebIDE";
  const token = process.env.GITHUB_TOKEN;

  try {
    const deadline = Date.now() + 120000; // 2 min
    let artifactId = null;

    while (Date.now() < deadline) {
      const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      const runs = await runsRes.json();
      const run = runs.workflow_runs?.find(
        r => r.name === "Compile Arduino Sketch" && r.status === "completed" && r.conclusion === "success"
      );

      if (run) {
        const artsRes = await fetch(run.artifacts_url, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        });
        const arts = await artsRes.json();
        const art = arts.artifacts?.find(a => a.name === "compiled-hex");
        if (art) { artifactId = art.id; break; }
      }
      await new Promise(r => setTimeout(r, 4000));
    }

    if (!artifactId) return res.status(408).json({ error: "Artifact not ready" });

    const zipRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }, redirect: "follow" }
    );
    const zipBuf = await zipRes.arrayBuffer();

    const zip = await JSZip.loadAsync(zipBuf);
    const hexName = Object.keys(zip.files).find(n => n.endsWith(".hex"));
    if (!hexName) return res.status(404).json({ error: "HEX file not found" });

    const hex = await zip.files[hexName].async("text");
    return res.status(200).json({ hex });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
