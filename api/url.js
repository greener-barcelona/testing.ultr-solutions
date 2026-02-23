import { Client, TakeOptions } from "screenshotone-api-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Falta url" });
  }
  try {
    const client = new Client(
      process.env.SCREENSHOTONE_ACCESS_KEY,
      process.env.SCREENSHOTONE_SECRET_KEY,
    );

    const options = TakeOptions.url(url)
      .format("webp")
      .blockAds(true)
      .blockCookieBanners(true)
      .fullPage(true)
      .imageQuality(80);

    const finalUrl = client.generateTakeURL(options);

    res.json({
      url: finalUrl,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Error al crear el screenshot de ${url}` });
  }
}
