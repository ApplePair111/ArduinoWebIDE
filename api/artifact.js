import JSZip from "jszip";

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const owner = "ApplePair111";
  const repo = "ArduinoWebIDE";
  const token = process.env.GITHUB_TOKEN;

  try {
    // Poll for up to 2 minutes
    const timeout = Date.now() + 0000;
    let artifactUrl = null;

    while (Date.now() < timeout) {
      const runsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });
      const runs = await runsRes.json();
      const run = runs.workflow_runs.find(
        (r) =>
          r.name === "Compile Arduino Sketch" &&
          r.status === "completed" &&
          r.conclusion === "success"
      );

      if (run) {
        const artifactsRes = await fetch(run.artifacts_url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        });
        const artifacts = await artifactsRes.json();
        const artifact = artifacts.artifacts.find((a) => a.name === "compiled-hex");
        if (artifact) {
          artifactUrl = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifact.id}/zip`;
          break;
        }
      }

      await new Promise((r) => setTimeout(r, 4000)); // wait 4s and retry
    }

    if (!artifactUrl) return res.status(408).json({ error: "Artifact not ready" });

    // Download artifact ZIP
    const zipRes = await fetch(artifactUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      redirect: "follow",
    });

    const zipBuffer = await zipRes.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);

    // Extract HEX
    const hexFileName = Object.keys(zip.files).find((n) => n.endsWith(".hex"));
    if (!hexFileName) return res.status(404).json({ error: "HEX file not found" });

    const hex = await zip.files[hexFileName].async("text");
    return res.status(200).json({ hex });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
