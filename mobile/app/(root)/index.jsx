import { useUser } from "@clerk/clerk-expo";
import { useRouter, useFocusEffect } from "expo-router";
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

import { openCamera, openGallery, processImage } from "../../utils/ocr";

export default function Page() {
  const { user } = useUser();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [ocrSheetVisible, setOcrSheetVisible] = useState(false);
  const [loadingOcr, setLoadingOcr] = useState(false);

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

    if (!data.success || !data.text) {
      Alert.alert("OCR Failed", data.message || "Could not extract text.");
      return;
    }

    const { name, total, category } = data.text;

    router.push({
      pathname: "/create",
      params: {
        title: name || "",
        amount: total ? String(total) : "",
        category: category || "other",
      },
    });
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
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>

        <BalanceCard summary={summary} />

        <View style={styles.transactionsHeaderContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
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

const BottomSheet = ({ children }) => (
  <View style={local.sheetContainer}>{children}</View>
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
});
