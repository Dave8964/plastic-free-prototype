import { ensureSchema, getSql, handleApiError, readJson, sendJson } from "./_db.js";

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
      const userId = url.searchParams.get("userId") || "user_me";
      const rows = await sql`
        SELECT product_id AS "productId", created_at AS "createdAt"
        FROM favorites
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      sendJson(res, 200, { favorites: rows.map((row) => row.productId) });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const userId = body.userId || "user_me";
      const productId = body.productId;
      const favorited = body.favorited !== false;

      if (!productId) {
        sendJson(res, 400, { error: "Favorite requires a product id." });
        return;
      }

      if (favorited) {
        await sql`
          INSERT INTO favorites (id, user_id, product_id)
          VALUES (${`favorite_${userId}_${productId}`}, ${userId}, ${productId})
          ON CONFLICT (user_id, product_id) DO NOTHING
        `;
      } else {
        await sql`
          DELETE FROM favorites
          WHERE user_id = ${userId} AND product_id = ${productId}
        `;
      }

      const rows = await sql`
        SELECT product_id AS "productId"
        FROM favorites
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      sendJson(res, 200, { favorites: rows.map((row) => row.productId) });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    handleApiError(res, error);
  }
}
