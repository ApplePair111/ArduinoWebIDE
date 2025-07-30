import JSZip from "jszip";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const repo = "ApplePair111/ArduinoWebIDE";
    const token = process.env.GITHUB_TOKEN;

    // 1. Find latest successful run
    const runsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const runsData = await runsRes.json();

    const run = runsData.workflow_runs.find(
      (r) => r.name === "Compile Arduino Sketch" && r.status === "completed" && r.conclusion === "success"
    );

    if (!run) return res.status(404).json({ error: "No successful run found" });

    // 2. Get artifacts
    const artifactsRes = await fetch(run.artifacts_url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const artifactsData = await artifactsRes.json();

    const artifact = artifactsData.artifacts.find((a) => a.name === "compiled-hex");
    if (!artifact) return res.status(404).json({ error: "Artifact not found" });

    // 3. Download artifact ZIP
    const zipRes = await fetch(artifact.archive_download_url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const zipBuffer = await zipRes.arrayBuffer();

    // 4. Extract HEX from ZIP
    const zip = await JSZip.loadAsync(zipBuffer);
    const hexFileName = Object.keys(zip.files).find((n) => n.endsWith(".hex"));
    if (!hexFileName) return res.status(404).json({ error: "HEX file not found" });

    const hexContent = await zip.files[hexFileName].async("text");

    return res.status(200).json({ hex: hexContent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
