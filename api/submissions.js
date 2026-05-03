import { ensureSchema, getSql, handleApiError, readJson, sendJson } from "./_db.js";

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
      const userId = url.searchParams.get("userId") || "user_me";
      const admin = url.searchParams.get("admin") === "1";
      const rows = admin
        ? await sql`
          SELECT id, user_id, product, parts, photos, created_at, updated_at
          FROM product_submissions
          ORDER BY updated_at DESC
        `
        : await sql`
          SELECT id, user_id, product, parts, photos, created_at, updated_at
          FROM product_submissions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;
      sendJson(res, 200, { submissions: rows });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const userId = body.userId || "user_me";
      const product = body.product;
      const parts = Array.isArray(body.parts) ? body.parts : [];
      const photos = body.photos || {};

      if (!product?.id) {
        sendJson(res, 400, { error: "Submission requires a product id." });
        return;
      }

      const rows = await sql`
        INSERT INTO product_submissions (id, user_id, product, parts, photos, updated_at)
        VALUES (${product.id}, ${userId}, CAST(${JSON.stringify(product)} AS jsonb), CAST(${JSON.stringify(parts)} AS jsonb), CAST(${JSON.stringify(photos)} AS jsonb), NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          product = EXCLUDED.product,
          parts = EXCLUDED.parts,
          photos = EXCLUDED.photos,
          updated_at = NOW()
        RETURNING id, user_id, product, parts, photos, created_at, updated_at
      `;

      sendJson(res, 200, { submission: rows[0] });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    handleApiError(res, error);
  }
}
