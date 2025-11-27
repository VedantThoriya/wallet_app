import { GoogleGenerativeAI } from "@google/generative-ai";
import { bufferToGeminiImage } from "../utils/bufferToGeminiImage.js";
import { classifyTransaction } from "../services/classifierService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function processReceiptOCR({ fileBuffer, mimeType }) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are an OCR and financial receipt parser. Read the receipt image and extract structured expense data.

Return ONLY this JSON object and nothing else:

{
  "name": string,
  "total": number,
  "category": "food" | "shopping" | "transportation" | "entertainment" | "bills" | "other"
}

Example: 

{
  "name": "Fish & Chips Fast Foods",
  "total": 41.29,
  "category": "food"
}

Extraction rules:

1. name:
   - Use the merchant/store/restaurant name from the receipt.
   - If unclear, create a short reasonable name like "Restaurant Expense", "Grocery Purchase", "General Store", etc.
   - Keep it short and human-friendly.

2. total:
   - Extract the final payable amount.
   - Prefer the largest meaningful total (avoid tax, subtotal, tip lines).
   - If multiple totals exist, choose the primary final price.

3. category:
   - Choose the most appropriate category from:
     food, shopping, transportation, entertainment, bills, income, other
   - Base this on merchant name, items, or context.
   - If unsure, return "other".

Output rules:
- Output ONLY valid JSON.
- No code fences, no markdown, no comments, no explanations.
- Do not include raw OCR text.
- Do not add additional fields.
`;

        const imagePart = bufferToGeminiImage(fileBuffer, mimeType);

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();

        if (!text || !text.trim()) {
            return {
                success: false,
                text: "",
                message: "No text detected by Gemini",
            };
        }

        const parsed = JSON.parse(text);

        // Fallback classification if Gemini is unsure
        if (!parsed.category || parsed.category.toLowerCase() === "other") {
            const predictedCategory = await classifyTransaction(parsed.name);
            parsed.category = predictedCategory.toLowerCase();
        }

        return {
            success: true,
            data: parsed,
        };
    } catch (err) {
        console.error("Gemini OCR Controller Error:", err);
        return {
            success: false,
            message: "Gemini OCR failed",
            error: err.message,
        };
    }
}
