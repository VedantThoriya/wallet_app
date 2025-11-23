// controllers/aiController.js
import { analyzeUserExpenses } from "../services/expenseAiService.js";

export async function analyzeExpensesController(req, res) {
  try {
    const { user_id, query } = req.body;

    if (!user_id || !query) {
      return res
        .status(400)
        .json({ success: false, message: "user_id and query are required" });
    }

    const result = await analyzeUserExpenses(user_id, query);

    return res.status(200).json(result);
  } catch (error) {
    console.error("AI analyze error:", error);
    return res
      .status(500)
      .json({ success: false, message: "AI analysis failed" });
  }
}
