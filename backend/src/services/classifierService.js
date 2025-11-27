import { pipeline } from "@xenova/transformers";

// Singleton instance
let classifier = null;

const CANDIDATE_LABELS = [
    "food",
    "shopping",
    "transportation",
    "entertainment",
    "bills",
    "other",
];

/**
 * Classifies a transaction title into a category.
 * @param {string} text - The transaction title (e.g., "Starbucks").
 * @returns {Promise<string>} - The predicted category.
 */
export async function classifyTransaction(text) {
    if (!text) return "Other";

    try {
        if (!classifier) {
            console.log("Loading classifier model...");
            classifier = await pipeline(
                "zero-shot-classification",
                "Xenova/mobilebert-uncased-mnli"
            );
        }

        const output = await classifier(text, CANDIDATE_LABELS);

        // output.labels[0] is the top prediction
        return output.labels[0];
    } catch (error) {
        console.error("Classification failed:", error);
        return "Other"; // Fallback
    }
}
