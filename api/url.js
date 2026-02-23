export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "Falta url" });
  }

  try {
    const params = new URLSearchParams({
      access_key: process.env.SCREENSHOTONE_ACCESS_KEY,
      url: url,
      format: "webp",
      block_ads: "true",
      block_cookie_banners: "true",
      full_page: "true",
      image_quality: "80",
    });

    const finalUrl = `https://api.screenshotone.com/take?${params.toString()}`;

    res.json({
      reply: finalUrl,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: `Error al crear el screenshot de ${url}` });
  }
}
