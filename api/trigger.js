// This is to be posted to Vercel Backend :)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sketch } = req.body || {};

  const response = await fetch(
    `https://api.github.com/repos/ApplePair111/ArduinoWebIDE/actions/workflows/main.yml/dispatches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GH_TOKEN}`, // GitHub token
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { sketch },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return res.status(response.status).json({ error });
  }

  res.status(200).json({ message: "Workflow triggered successfully!" });
}
