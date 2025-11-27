// src/controllers/insightsController.js
import { generateInsights } from "../services/insightsService.js";
import { sendInsightsEmail } from "../services/emailService.js";

/**
 * Generate insights for a user
 * POST /insights/generate
 */
export async function generateUserInsights(req, res) {
    try {
        const { user_id, period = "week" } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: "user_id is required",
            });
        }

        if (!["week", "month"].includes(period)) {
            return res.status(400).json({
                success: false,
                message: "period must be 'week' or 'month'",
            });
        }

        const result = await generateInsights(user_id, period);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Generate insights error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate insights",
        });
    }
}

/**
 * Generate and send insights via email
 * POST /insights/email
 */
export async function sendInsightsViaEmail(req, res) {
    try {
        const { user_id, email, period = "week" } = req.body;

        if (!user_id || !email) {
            return res.status(400).json({
                success: false,
                message: "user_id and email are required",
            });
        }

        // Generate insights
        const insightsResult = await generateInsights(user_id, period);

        if (!insightsResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate insights",
            });
        }

        // Send email
        const emailResult = await sendInsightsEmail(email, insightsResult);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: "Failed to send email",
                error: emailResult.error,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Insights email sent successfully",
            messageId: emailResult.messageId,
        });
    } catch (error) {
        console.error("Send insights email error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send insights email",
        });
    }
}
