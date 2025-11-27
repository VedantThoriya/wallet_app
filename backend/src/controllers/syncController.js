// src/controllers/syncController.js
import { sql } from "../config/db.js";
import { upsertTransactions } from "../services/vectorStoreService.js";

/**
 * Sync all transactions to Pinecone
 * POST /api/sync
 */
export async function syncTransactions(req, res) {
    try {
        console.log("Starting manual sync...");

        // Fetch all transactions
        const transactions = await sql`SELECT * FROM transactions`;
        console.log(`Found ${transactions.length} transactions.`);

        if (transactions.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No transactions to sync.",
                count: 0
            });
        }

        // Upsert to Pinecone
        await upsertTransactions(transactions);

        console.log("Sync complete!");

        return res.status(200).json({
            success: true,
            message: "Transactions synced successfully.",
            count: transactions.length
        });

    } catch (error) {
        console.error("Sync failed:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to sync transactions.",
            error: error.message
        });
    }
}
