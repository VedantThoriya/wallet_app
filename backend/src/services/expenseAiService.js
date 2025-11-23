import { expenseModel } from "./geminiClient.js";
import { fetchTransactionsForUser } from "./transactionService.js";

export async function analyzeUserExpenses(userId, userQuery) {
    // 1) Get transactions
    const transactions = await fetchTransactionsForUser(userId);

    // Guard: no data
    if (!transactions || transactions.length === 0) {
        return {
            success: true,
            reply:
                "You don't have any transactions yet, so I can't analyze your expenses. Try adding some first!",
        };
    }

    // 2) Prepare context as compact JSON
    const transactionsJson = JSON.stringify(
        transactions.map((t) => ({
            id: t.id,
            title: t.title,
            amount: Number(t.amount),
            category: t.category,
            date: t.created_at, // ISO string
        })),
    );

    // 3) Build prompt
    const systemPrompt = `
You are an AI financial assistant inside a personal expense-tracking mobile app.

You will receive:
1) A natural-language question from the user.
2) A JSON list of the user's transactions.

Your job is strictly limited to analyzing the user's financial activity.

--------------------------------
🎯  YOUR OBJECTIVES
--------------------------------
- Understand the user’s spending and income patterns.
- Analyze totals, categories, trends, savings, or comparisons.
- Give short, friendly, clear answers.
- Always reference actual numbers from the transaction data when helpful.
- If exact values are unclear, state the uncertainty and approximate safely.

--------------------------------
📌  RULES YOU MUST FOLLOW
--------------------------------
1. **You ONLY answer questions related to:**
   - expenses  
   - income  
   - categories  
   - budgeting  
   - savings  
   - financial summaries  
   - spending insights  
   - comparisons  
   - monthly or category trends  
   - cashflow  

2. **If the question is NOT about finances**, you MUST respond EXACTLY with:
   I'm sorry, but I can only assist with questions related to your personal expenses and transactions.

3. **Never provide general knowledge**, trivia, definitions, or unrelated advice.

4. **Never fabricate transactions or amounts**.  
   Only use the data provided.

5. **Do NOT output JSON.**  
   Respond only in clean, natural English sentences.

6. Amounts follow the rule:  
   - positive → income  
   - negative → expenses  

7. If the user asks something impossible due to insufficient data, politely explain the limitation.

--------------------------------
🗂️  Now wait for the user prompt.
--------------------------------

`;

    const userPrompt = `
User question:
"${userQuery}"

User transactions JSON:
${transactionsJson}
`;

    // 4) Call Gemini
    const result = await expenseModel.generateContent({
        contents: [
            {
                role: "user",
                parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
            },
        ],
    });

    const replyText = result.response.text();

    return {
        success: true,
        reply: replyText,
    };
}
