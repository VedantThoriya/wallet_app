import { pineconeIndex } from "./pineconeClient.js";
import { embeddingModel } from "./geminiClient.js";

/**
 * Generates an embedding for a given text using Gemini.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Upserts a list of transactions into Pinecone.
 * @param {Array} transactions
 */
export async function upsertTransactions(transactions) {
    if (!transactions || transactions.length === 0) return;

    const vectors = await Promise.all(
        transactions.map(async (t) => {
            // Create a descriptive string for the embedding
            const textToEmbed = `Spent ${t.amount} on ${t.title} in category ${t.category} on ${t.created_at}`;
            const embedding = await generateEmbedding(textToEmbed);

            return {
                id: t.id.toString(), // Pinecone IDs must be strings
                values: embedding,
                metadata: {
                    userId: t.user_id, // Important for filtering by user
                    title: t.title,
                    amount: Number(t.amount),
                    category: t.category,
                    date: new Date(t.created_at).toISOString(),
                    text: textToEmbed,
                },
            };
        })
    );

    // Upsert in batches (Pinecone recommends batches of ~100)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await pineconeIndex.upsert(batch);
    }
}

/**
 * Queries Pinecone for relevant transactions based on a user query.
 * @param {string} query - The user's natural language query.
 * @param {string|number} userId - The user ID to filter by.
 * @param {number} topK - Number of results to return.
 * @returns {Promise<Array>} - List of relevant transactions.
 */
export async function queryTransactions(query, userId, topK = 20) {
    const queryEmbedding = await generateEmbedding(query);

    const queryResponse = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: topK,
        filter: {
            userId: userId, // strict filter for security
        },
        includeMetadata: true,
    });

    return queryResponse.matches.map((match) => ({
        id: match.id,
        score: match.score,
        ...match.metadata,
    }));
}

/**
 * Deletes a transaction from Pinecone by ID.
 * @param {string|number} transactionId
 */
export async function deleteTransaction(transactionId) {
    if (!transactionId) return;
    await pineconeIndex.deleteOne(transactionId.toString());
}
