import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-gifted-charts";

import { COLORS } from "../../constants/colors";
import { API_URL } from "../../constants/api";
import SafeScreen from "../../components/SafeScreen";

export default function Insights() {
  const { user } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (params.cachedData) {
      try {
        const parsedData = JSON.parse(params.cachedData);
        setData(parsedData);
        setLoading(false);
      } catch (e) {
        console.error("Error parsing cached data:", e);
        fetchInsights();
      }
    } else {
      fetchInsights();
    }
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/insights/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          period: "month",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setData(result.insights);
      } else {
        Alert.alert("Error", "Failed to load insights.");
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      Alert.alert("Error", "Something went wrong while fetching insights.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating your monthly insights...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (!data) {
    return (
      <SafeScreen>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Insights</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No insights available.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchInsights}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const { currentPeriod, trends, anomalies, summary } = data;

  // Prepare data for Donut Chart
  const pieData = currentPeriod.categories.map((cat, index) => {
    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];
    return {
      value: parseFloat(cat.total),
      color: colors[index % colors.length],
      text: `${Math.round(cat.percentage)}%`,
      legend: cat.name,
    };
  });

  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        {pieData.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.legend} ({item.text})
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Monthly Insights</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* AI Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={20} color={COLORS.primary} />
              <Text style={styles.summaryTitle}>AI Summary</Text>
            </View>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>

          {/* Net Balance */}
          <View style={styles.balanceCard}>
            <Text style={styles.cardTitle}>Net Balance</Text>
            <Text style={styles.netBalanceAmount}>₹{currentPeriod.netBalance.toFixed(2)}</Text>
            <View style={styles.balanceStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Income</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  ₹{currentPeriod.totalIncome}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Expense</Text>
                <Text style={[styles.statValue, { color: COLORS.danger }]}>
                  ₹{currentPeriod.totalSpent}
                </Text>
              </View>
            </View>
          </View>

          {/* Spending Chart */}
          {/* <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Where it went</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                donut
                showText
                textColor="white"
                radius={120}
                innerRadius={60}
                textSize={12}
                focusOnPress
                strokeWidth={2}
                strokeColor={COLORS.card}
              />
            </View>
            {renderLegend()}
          </View> */}

          {/* Movers & Shakers */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Movers & Shakers</Text>
            {trends
              .filter((t) => t.type === "category")
              .map((trend, index) => (
                <View key={index} style={styles.trendItem}>
                  <View style={styles.trendLeft}>
                    <Text style={styles.trendCategory}>
                      {trend.category.charAt(0).toUpperCase() + trend.category.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.trendRight}>
                    <Text
                      style={[
                        styles.trendPercent,
                        {
                          color:
                            trend.direction === "increase" ? COLORS.danger : COLORS.success,
                        },
                      ]}
                    >
                      {trend.direction === "increase" ? "+" : ""}
                      {trend.changePercent}%
                    </Text>
                    <Ionicons
                      name={trend.direction === "increase" ? "trending-up" : "trending-down"}
                      size={16}
                      color={trend.direction === "increase" ? COLORS.danger : COLORS.success}
                    />
                  </View>
                </View>
              ))}
          </View>

          {/* Large Expenses */}
          {anomalies.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>⚠️ Large Expenses</Text>
              {anomalies.map((item, index) => (
                <View key={index} style={styles.anomalyItem}>
                  <View>
                    <Text style={styles.anomalyMerchant}>{item.merchant}</Text>
                    <Text style={styles.anomalyDate}>
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.anomalyAmount}>₹{item.amount}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 10,
    fontWeight: "600",
  },
  netBalanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
  },
  balanceStats: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 15,
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
  },
  sectionContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  trendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trendLeft: {
    flex: 1,
  },
  trendCategory: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  trendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trendPercent: {
    fontSize: 16,
    fontWeight: "600",
  },
  anomalyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  anomalyMerchant: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  anomalyDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  anomalyAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
});
