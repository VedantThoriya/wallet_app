// src/services/insightsService.js
import { sql } from "../config/db.js";
import { expenseModel } from "./geminiClient.js";

/**
 * Generate comprehensive spending insights for a user
 * @param {string} userId - User ID
 * @param {string} period - 'week' or 'month'
 * @returns {Promise<Object>} Insights data with AI summary
 */
export async function generateInsights(userId, period = "week") {
    try {
        // 1) Get date ranges
        const { currentStart, currentEnd, previousStart, previousEnd } =
            getDateRanges(period);

        // 2) Fetch transactions for current and previous periods
        const currentTransactions = await sql`
            SELECT * FROM transactions
            WHERE user_id = ${userId}
                AND created_at::date >= ${currentStart}
                AND created_at::date <= ${currentEnd}
            ORDER BY created_at DESC
        `;

        const previousTransactions = await sql`
            SELECT * FROM transactions
            WHERE user_id = ${userId}
                AND created_at::date >= ${previousStart}
                AND created_at::date < ${currentStart}
            ORDER BY created_at DESC
        `;

        // 3) Calculate insights
        const currentBreakdown = calculateCategoryBreakdown(currentTransactions);
        const previousBreakdown = calculateCategoryBreakdown(previousTransactions);
        const trends = detectTrends(currentBreakdown, previousBreakdown);
        const anomalies = findAnomalies(currentTransactions);
        const topMerchants = getTopMerchants(currentTransactions);

        // 4) Prepare insights data
        const insightsData = {
            period,
            currentPeriod: {
                start: currentStart,
                end: currentEnd,
                totalSpent: currentBreakdown.totalSpent,
                totalIncome: currentBreakdown.totalIncome,
                netBalance: currentBreakdown.netBalance,
                categories: currentBreakdown.categories,
                transactionCount: currentTransactions.length,
            },
            previousPeriod: {
                totalSpent: previousBreakdown.totalSpent,
                totalIncome: previousBreakdown.totalIncome,
            },
            trends,
            anomalies,
            topMerchants,
        };

        // 5) Generate AI summary
        let aiSummary;
        if (currentTransactions.length < 5) {
            aiSummary = await generateLowDataSummary(insightsData);
        } else {
            aiSummary = await generateAISummary(insightsData);
        }
        insightsData.summary = aiSummary;

        return {
            success: true,
            insights: insightsData,
        };
    } catch (error) {
        console.error("Error generating insights:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Calculate date ranges for current and previous periods
 */
function getDateRanges(period) {
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    if (period === "week") {
        // Current week (last 7 days)
        currentEnd = now.toISOString().split("T")[0];
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        // Previous week
        previousEnd = currentStart;
        previousStart = new Date(
            new Date(currentStart).getTime() - 7 * 24 * 60 * 60 * 1000,
        )
            .toISOString()
            .split("T")[0];
    } else {
        // Current month
        currentEnd = now.toISOString().split("T")[0];
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];

        // Previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousStart = prevMonth.toISOString().split("T")[0];
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            .toISOString()
            .split("T")[0];
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Calculate category breakdown with totals and percentages
 */
function calculateCategoryBreakdown(transactions) {
    const categories = {};
    let totalSpent = 0;
    let totalIncome = 0;

    transactions.forEach((t) => {
        const amount = parseFloat(t.amount);
        if (amount < 0) {
            // Expense
            const absAmount = Math.abs(amount);
            totalSpent += absAmount;

            if (!categories[t.category]) {
                categories[t.category] = { total: 0, count: 0, transactions: [] };
            }
            categories[t.category].total += absAmount;
            categories[t.category].count += 1;
            categories[t.category].transactions.push(t);
        } else {
            // Income
            totalIncome += amount;
        }
    });

    // Calculate percentages and round totals
    Object.keys(categories).forEach((cat) => {
        categories[cat].total = parseFloat(categories[cat].total.toFixed(2));
        categories[cat].percentage = (
            (categories[cat].total / totalSpent) *
            100
        ).toFixed(1);
    });

    // Sort by total
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([name, data]) => ({ name, ...data }));

    return {
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        netBalance: parseFloat((totalIncome - totalSpent).toFixed(2)),
        categories: sortedCategories,
    };
}

/**
 * Detect spending trends (increases/decreases)
 */
function detectTrends(current, previous) {
    const trends = [];

    // Overall spending trend
    const spendingChange = current.totalSpent - previous.totalSpent;
    const spendingChangePercent =
        previous.totalSpent > 0
            ? ((spendingChange / previous.totalSpent) * 100).toFixed(1)
            : 0;

    trends.push({
        type: "overall",
        change: parseFloat(spendingChange.toFixed(2)),
        changePercent: spendingChangePercent,
        direction: spendingChange > 0 ? "increase" : "decrease",
    });

    // Category trends
    current.categories.forEach((cat) => {
        const prevCat = previous.categories.find((c) => c.name === cat.name);
        if (prevCat) {
            const change = cat.total - prevCat.total;
            const changePercent = ((change / prevCat.total) * 100).toFixed(1);

            if (Math.abs(changePercent) > 20) {
                // Significant change
                trends.push({
                    type: "category",
                    category: cat.name,
                    change: parseFloat(change.toFixed(2)),
                    changePercent,
                    direction: change > 0 ? "increase" : "decrease",
                });
            }
        }
    });

    return trends;
}

/**
 * Find anomalies (unusual spending patterns)
 */
function findAnomalies(transactions) {
    const anomalies = [];

    // Group by merchant
    const merchantCounts = {};
    const merchantTotals = {};

    // Filter for expenses only (negative amounts)
    const expenseTransactions = transactions.filter((t) => parseFloat(t.amount) < 0);

    expenseTransactions.forEach((t) => {
        const merchant = t.title;
        const amount = Math.abs(parseFloat(t.amount));
        merchantCounts[merchant] = (merchantCounts[merchant] || 0) + 1;
        merchantTotals[merchant] = (merchantTotals[merchant] || 0) + amount;
    });

    // Find frequent merchants (3+ visits)
    Object.entries(merchantCounts).forEach(([merchant, count]) => {
        if (count >= 3) {
            anomalies.push({
                type: "frequent",
                merchant,
                count,
                total: merchantTotals[merchant].toFixed(2),
            });
        }
    });

    // Find large transactions (>$100)
    expenseTransactions
        .filter((t) => Math.abs(parseFloat(t.amount)) > 100)
        .forEach((t) => {
            anomalies.push({
                type: "large",
                merchant: t.title,
                amount: Math.abs(parseFloat(t.amount)).toFixed(2),
                category: t.category,
                date: t.created_at, // Changed from t.date to t.created_at to match DB
            });
        });

    return anomalies;
}

/**
 * Get top merchants by spending
 */
function getTopMerchants(transactions) {
    const merchantTotals = {};

    transactions
        .filter((t) => t.amount < 0)
        .forEach((t) => {
            const merchant = t.title;
            merchantTotals[merchant] =
                (merchantTotals[merchant] || 0) + Math.abs(t.amount);
        });

    return Object.entries(merchantTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([merchant, total]) => ({
            merchant,
            total: total.toFixed(2),
        }));
}

/**
 * Generate AI-written summary using Gemini
 */
async function generateAISummary(insightsData) {
    const { currentPeriod, previousPeriod, trends, anomalies, topMerchants } =
        insightsData;

    const prompt = `
You are a friendly financial advisor. Write a personalized spending summary for the user.

Period: ${insightsData.period === "week" ? "This Week" : "This Month"}

Current Period:
- Total Spent: $${currentPeriod.totalSpent.toFixed(2)}
- Total Income: $${currentPeriod.totalIncome.toFixed(2)}
- Net Balance: $${currentPeriod.netBalance.toFixed(2)}
- Transactions: ${currentPeriod.transactionCount}

Top Categories:
${currentPeriod.categories
            .slice(0, 3)
            .map((c) => `- ${c.name}: $${c.total.toFixed(2)} (${c.percentage}%)`)
            .join("\n")}

Trends:
${trends
            .slice(0, 3)
            .map((t) => {
                if (t.type === "overall") {
                    return `- Overall spending ${t.direction}d by ${Math.abs(t.changePercent)}%`;
                }
                return `- ${t.category}: ${t.direction}d by ${Math.abs(t.changePercent)}%`;
            })
            .join("\n")}

Anomalies:
${anomalies
            .slice(0, 3)
            .map((a) => {
                if (a.type === "frequent") {
                    return `- ${a.merchant}: ${a.count} visits ($${a.total})`;
                }
                return `- Large expense: ${a.merchant} ($${a.amount})`;
            })
            .join("\n")}

Write a friendly, concise summary (3-4 paragraphs) that:
1. Highlights the overall spending situation
2. Points out interesting trends or changes
3. Mentions any concerning patterns (if any)
4. Gives ONE actionable savings tip

Consider all the amounts in the insights data to be in INR.
Keep it positive and encouraging. Use emojis sparingly.
`;

    try {
        const result = await expenseModel.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("AI summary generation failed:", error);
        return "Unable to generate AI summary at this time.";
    }
}

/**
 * Generate AI summary for low data scenarios
 */
async function generateLowDataSummary(insightsData) {
    const { currentPeriod } = insightsData;

    const prompt = `
You are a friendly financial advisor. The user has very few transactions (${currentPeriod.transactionCount}) for this period (${insightsData.period === "week" ? "This Week" : "This Month"}).

Total Spent: ₹${currentPeriod.totalSpent.toFixed(2)}
Total Income: ₹${currentPeriod.totalIncome.toFixed(2)}

Write a short, encouraging message (1-2 paragraphs) that:
1. Acknowledges the low activity (e.g., "It looks like a quiet week!").
2. Mentions the total spent if > 0.
3. Encourages them to keep tracking their expenses to unlock more detailed insights.

Keep it light and friendly.
`;

    try {
        const result = await expenseModel.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Low data summary generation failed:", error);
        return "It looks like a quiet period! Keep adding transactions to see more detailed insights.";
    }
}
