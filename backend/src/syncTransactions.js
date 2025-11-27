import { sql } from "./config/db.js";
import { upsertTransactions } from "./services/vectorStoreService.js";

async function syncAllTransactions() {
    console.log("Starting sync...");

    // Fetch all transactions
    const transactions = await sql`SELECT * FROM transactions`;
    console.log(`Found ${transactions.length} transactions.`);

    if (transactions.length === 0) {
        console.log("No transactions to sync.");
        process.exit(0);
    }

    // Upsert to Pinecone
    await upsertTransactions(transactions);

    console.log("Sync complete!");
    process.exit(0);
}

syncAllTransactions().catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
});
