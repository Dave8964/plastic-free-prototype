import { ensureSchema, getSql, handleApiError, readJson, sendJson } from "./_db.js";

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
      const userId = url.searchParams.get("userId") || "user_me";
      const rows = await sql`
        SELECT id, user_id AS "userId", product_id AS "productId", created_at AS "createdAt"
        FROM scan_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      sendJson(res, 200, { scans: rows });
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const userId = body.userId || "user_me";
      const productId = body.productId;
      const scanId = body.id || `scan_${productId}_${Date.now()}`;

      if (!productId) {
        sendJson(res, 400, { error: "Scan requires a product id." });
        return;
      }

      const rows = await sql`
        INSERT INTO scan_history (id, user_id, product_id)
        VALUES (${scanId}, ${userId}, ${productId})
        ON CONFLICT (id) DO NOTHING
        RETURNING id, user_id AS "userId", product_id AS "productId", created_at AS "createdAt"
      `;

      sendJson(res, 200, { scan: rows[0] || { id: scanId, userId, productId } });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    handleApiError(res, error);
  }
}
