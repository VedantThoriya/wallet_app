import { sql } from "../config/db.js";

export async function fetchTransactionsForUser(userId, limit = 200) {
  const rows = await sql`
    SELECT id, title, amount, category, created_at
    FROM transactions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows;
}
