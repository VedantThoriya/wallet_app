// src/services/emailService.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const nodemailer = require("nodemailer");

/**
 * Create email transporter
 */
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send insights email to user
 * @param {string} userEmail - Recipient email
 * @param {Object} insights - Insights data
 * @returns {Promise<Object>} Send result
 */
export async function sendInsightsEmail(userEmail, insights) {
    try {
        const { period, currentPeriod, trends, anomalies, summary } =
            insights.insights;

        // Build email HTML
        const emailHTML = buildInsightsEmailHTML(insights.insights);

        // Send email
        const info = await transporter.sendMail({
            from: `"Wallet App Insights" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `📊 Your ${period === "week" ? "Weekly" : "Monthly"} Spending Report`,
            html: emailHTML,
        });

        console.log("✅ Email sent:", info.messageId);

        return {
            success: true,
            messageId: info.messageId,
        };
    } catch (error) {
        console.error("❌ Email send failed:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Build HTML email template
 */
function buildInsightsEmailHTML(insights) {
    const { period, currentPeriod, previousPeriod, trends, anomalies, summary, topMerchants } =
        insights;

    const periodLabel = period === "week" ? "This Week" : "This Month";
    const overallTrend = trends.find((t) => t.type === "overall");
    const trendEmoji = overallTrend?.direction === "decrease" ? "📉" : "📈";
    const trendColor = overallTrend?.direction === "decrease" ? "#10b981" : "#ef4444";

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }
        .header h1 {
            margin: 0;
            color: #1f2937;
            font-size: 28px;
        }
        .header p {
            margin: 10px 0 0 0;
            color: #6b7280;
            font-size: 14px;
        }
        .summary-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 25px;
        }
        .summary-box h2 {
            margin: 0 0 10px 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .summary-box .amount {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .trend {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            background: rgba(255,255,255,0.2);
        }
        .section {
            margin: 25px 0;
        }
        .section h3 {
            color: #1f2937;
            font-size: 18px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .section h3 span {
            margin-right: 8px;
        }
        .category-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            margin: 8px 0;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .category-name {
            font-weight: 600;
            color: #374151;
            text-transform: capitalize;
        }
        .category-amount {
            color: #6b7280;
        }
        .anomaly-item {
            padding: 12px;
            margin: 8px 0;
            background: #fef3c7;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
        }
        .ai-summary {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
            margin: 25px 0;
            line-height: 1.8;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 ${periodLabel} Report</h1>
            <p>${currentPeriod.start} to ${currentPeriod.end}</p>
        </div>

        <div class="summary-box">
            <h2>Total Spent</h2>
            <div class="amount">$${currentPeriod.totalSpent.toFixed(2)}</div>
            ${overallTrend
            ? `<span class="trend" style="color: ${trendColor}">
                ${trendEmoji} ${Math.abs(overallTrend.changePercent)}% vs last ${period}
            </span>`
            : ""
        }
        </div>

        <div class="section">
            <h3><span>📈</span> Top Categories</h3>
            ${currentPeriod.categories
            .slice(0, 5)
            .map(
                (cat) => `
                <div class="category-item">
                    <span class="category-name">${cat.name}</span>
                    <span class="category-amount">$${cat.total.toFixed(2)} (${cat.percentage}%)</span>
                </div>
            `,
            )
            .join("")}
        </div>

        ${anomalies.length > 0
            ? `
        <div class="section">
            <h3><span>🔥</span> Hot Spots</h3>
            ${anomalies
                .slice(0, 3)
                .map((a) => {
                    if (a.type === "frequent") {
                        return `<div class="anomaly-item">
                        <strong>${a.merchant}</strong>: ${a.count} visits ($${a.total})
                    </div>`;
                    }
                    return `<div class="anomaly-item">
                        Large expense: <strong>${a.merchant}</strong> ($${a.amount})
                    </div>`;
                })
                .join("")}
        </div>
        `
            : ""
        }

        <div class="ai-summary">
            <h3 style="margin-top: 0;">💡 AI Insights</h3>
            ${summary.replace(/\n/g, "<br>")}
        </div>

        <div class="footer">
            <p>Keep up the great work! 🎉</p>
            <p style="font-size: 12px; margin-top: 10px;">
                This is an automated report from your Wallet App
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
    try {
        await transporter.verify();
        console.log("✅ Email server is ready");
        return true;
    } catch (error) {
        console.error("❌ Email server error:", error);
        return false;
    }
}
