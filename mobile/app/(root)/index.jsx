import { useUser } from "@clerk/clerk-expo";
import { useRouter, useFocusEffect } from "expo-router";
import { COLORS } from "../../constants/colors";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SignOutButton } from "@/components/SignOutButton";
import { useTransactions } from "../../hooks/useTransactions";
import PageLoader from "../../components/PageLoader";
import { styles } from "../../assets/styles/home.styles";
import { BalanceCard } from "../../components/BalanceCard";
import { TransactionItem } from "../../components/TransactionItem";
import NoTransactionsFound from "../../components/NoTransactionsFound";
import { API_URL } from "../../constants/api";

import { openCamera, openGallery, processImage } from "../../utils/ocr";

export default function Page() {
  const { user } = useUser();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [ocrSheetVisible, setOcrSheetVisible] = useState(false);

  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsSheetVisible, setInsightsSheetVisible] = useState(false);
  const [insightsMenuVisible, setInsightsMenuVisible] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  const { transactions, summary, isLoading, loadData, deleteTransaction } =
    useTransactions(user.id);

  useEffect(() => {
    loadData(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Transaction", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteTransaction(id) },
    ]);
  };

  const handleProcessImage = async (uri) => {
    setLoadingOcr(true);

    const data = await processImage(uri);

    setLoadingOcr(false);
    setPickerVisible(false);
    setOcrSheetVisible(false);

    console.log("OCR Response received:", JSON.stringify(data, null, 2));

    if (!data.success || !data.data) {
      console.log("OCR validation failed - showing error alert");
      Alert.alert("OCR Failed", data.message || "Could not extract text.");
      return;
    }

    const { name, total, category } = data.data;

    console.log("Extracted values - name:", name, "total:", total, "category:", category);

    router.push({
      pathname: "/create",
      params: {
        title: name || "",
        amount: total ? String(total) : "",
        category: category || "other",
      },
    });
  };

  const fetchInsights = async (period) => {
    try {
      setLoadingInsights(true);
      const response = await fetch(`${API_URL}/insights/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          period: period,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { transactionCount } = result.insights.currentPeriod;
        
        if (transactionCount < 5) {
          // Scenario A: Low Data -> Show Bottom Sheet
          setAiSummary(result.insights.summary);
          setInsightsSheetVisible(true);
        } else {
          // Scenario B: Rich Data -> Go to Full Screen
          router.push({
            pathname: "/insights",
            params: { cachedData: JSON.stringify(result.insights) },
          });
        }
      } else {
        Alert.alert("Error", "Failed to generate insights.");
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoadingInsights(false);
    }
  };

  if (isLoading && !refreshing) return <PageLoader />;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.usernameText}>
                {user?.emailAddresses[0]?.emailAddress.split("@")[0]}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/ai-chat")}
            >
              <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        <BalanceCard summary={summary} />

        <View style={styles.transactionsHeaderContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setInsightsMenuVisible(true)}
              disabled={loadingInsights}
            >
              {loadingInsights ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="pie-chart-outline" size={22} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* TRANSACTION LIST */}
      <FlatList
        style={styles.transactionsList}
        contentContainerStyle={styles.transactionsListContent}
        data={transactions}
        renderItem={({ item }) => (
          <TransactionItem item={item} onDelete={handleDelete} />
        )}
        ListEmptyComponent={<NoTransactionsFound />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Sheet 1 — Add / OCR */}
      {pickerVisible && (
        <BottomSheet>
          <Btn
            onPress={() => {
              setPickerVisible(false);
              router.push("/create");
            }}
          >
            Add Manually
          </Btn>

          <Btn
            onPress={() => {
              setPickerVisible(false);
              setOcrSheetVisible(true);
            }}
          >
            Scan Receipt (OCR)
          </Btn>

          <BtnCancel onPress={() => setPickerVisible(false)}>Cancel</BtnCancel>
        </BottomSheet>
      )}

      {/* Sheet 2 — Camera / Gallery */}
      {ocrSheetVisible && (
        <BottomSheet>
          <Btn onPress={() => openCamera(handleProcessImage)}>Take Photo</Btn>
          <Btn onPress={() => openGallery(handleProcessImage)}>
            Choose from Gallery
          </Btn>
          <BtnCancel onPress={() => setOcrSheetVisible(false)}>Cancel</BtnCancel>
        </BottomSheet>
      )}

      {/* Sheet 3 — Insights Low Data */}
      {insightsSheetVisible && (
        <BottomSheet>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Ionicons name="sparkles" size={32} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
              Weekly Snapshot
            </Text>
            <Text
              style={{
                textAlign: "center",
                color: COLORS.text,
                fontSize: 16,
                lineHeight: 24,
                marginTop: 10,
              }}
            >
              {aiSummary}
            </Text>
          </View>

          <Btn
            onPress={() => {
              setInsightsSheetVisible(false);
              router.push("/create");
            }}
          >
            Add Expense
          </Btn>

          <BtnCancel onPress={() => setInsightsSheetVisible(false)}>
            Close
          </BtnCancel>
        </BottomSheet>
      )}

      {/* Sheet 4 — Insights Menu */}
      {insightsMenuVisible && (
        <BottomSheet onDismiss={() => setInsightsMenuVisible(false)}>
          <Text style={[styles.sectionTitle, { textAlign: "center", marginBottom: 20 }]}>
            Select Period
          </Text>
          
          <TouchableOpacity 
            style={local.optionBtn} 
            onPress={() => {
              setInsightsMenuVisible(false);
              fetchInsights("week");
            }}
          >
            <View style={local.optionIconContainer}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={local.optionTitle}>Weekly Insights</Text>
              <Text style={local.optionSubtitle}>Last 7 days analysis</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={local.optionBtn} 
            onPress={() => {
              setInsightsMenuVisible(false);
              fetchInsights("month");
            }}
          >
            <View style={local.optionIconContainer}>
              <Ionicons name="calendar" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={local.optionTitle}>Monthly Insights</Text>
              <Text style={local.optionSubtitle}>Last 30 days analysis</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </BottomSheet>
      )}

      {/* Sheet 5 — Loading Insights */}
      {loadingInsights && (
        <BottomSheet>
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <Ionicons name="analytics-outline" size={80} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>
              Generating Insights
            </Text>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 15 }} />
            <Text style={{ color: COLORS.textLight, fontSize: 16, textAlign: "center" }}>
              Analyzing your transactions...
            </Text>
          </View>
        </BottomSheet>
      )}

      {/* OCR LOADING OVERLAY */}
      {loadingOcr && (
        <View style={local.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 10 }}>
            Processing receipt...
          </Text>
        </View>
      )}
    </View>
  );
}

/* -------------------- Bottom Sheet Components -------------------- */

const BottomSheet = ({ children, onDismiss }) => (
  <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
    <TouchableOpacity 
      style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} 
      activeOpacity={1} 
      onPress={onDismiss}
    />
    <View style={local.sheetContainer}>{children}</View>
  </View>
);
const Btn = ({ children, onPress }) => (
  <TouchableOpacity style={local.sheetBtn} onPress={onPress}>
    <Text style={local.sheetBtnText}>{children}</Text>
  </TouchableOpacity>
);

const BtnCancel = ({ children, onPress }) => (
  <TouchableOpacity style={local.sheetBtn} onPress={onPress}>
    <Text style={[local.sheetBtnText, { color: "red" }]}>{children}</Text>
  </TouchableOpacity>
);

/* -------------------- Local Styles -------------------- */

const local = StyleSheet.create({
  sheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 25,
  },
  sheetBtn: {
    paddingVertical: 14,
  },
  sheetBtnText: {
    fontSize: 18,
    textAlign: "center",
    color: "#111",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
});
