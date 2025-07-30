// This is to be posted to Vercel Backend :)

export default async function handler(req, res) {
  // CORS headers for ALL requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end(); // 👈 browser just wants a 200 OK
  }

  // Only allow POST for main functionality
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sketch } = req.body;

    if (!sketch) {
      return res.status(400).json({ error: "Missing sketch" });
    }

    // Trigger GitHub Action via dispatch
    const result = await fetch(
      "https://api.github.com/repos/ApplePair111/ArduinoWebIDE/actions/workflows/main.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "trigger-sketch-compile",
          client_payload: { sketch },
        }),
      }
    );

    const text = await result.text();

    if (!result.ok) {
      return res.status(result.status).json({ error: text });
    }

    return res.status(200).json({ status: "Triggered successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
