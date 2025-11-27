import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/ai-chat.styles";
import { COLORS } from "../../constants/colors";
import { useAIChat } from "../../hooks/useAIChat";

const SUGGESTED_QUESTIONS = [
  "What is my biggest expense this month?",
  "How much did I spend on food?",
  "Show my income vs expenses",
  "What's my spending trend?",
];

export default function AIChat() {
  const router = useRouter();
  const { user } = useUser();
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat(user.id);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() && !isLoading) {
      sendMessage(inputText.trim());
      setInputText("");
    }
  };

  const handleSuggestedQuestion = (question) => {
    sendMessage(question);
  };

  const handleClearChat = () => {
    Alert.alert(
      "Clear Chat History",
      "Are you sure you want to delete all messages? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearMessages(),
        },
      ]
    );
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageWrapper,
        item.isUser ? styles.messageWrapperUser : styles.messageWrapperAI,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.messageBubbleUser : styles.messageBubbleAI,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.isUser ? styles.messageTextUser : styles.messageTextAI,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            item.isUser ? styles.timestampUser : styles.timestampAI,
          ]}
        >
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="chatbubbles-outline"
        size={64}
        color={COLORS.textLight}
        style={styles.emptyStateIcon}
      />
      <Text style={styles.emptyStateTitle}>AI Expense Assistant</Text>
      <Text style={styles.emptyStateText}>
        Ask me anything about your expenses, income, or spending habits!
      </Text>

      <View style={styles.suggestedQuestionsContainer}>
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestedQuestionButton}
            onPress={() => handleSuggestedQuestion(question)}
          >
            <Text style={styles.suggestedQuestionText}>{question}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingBubble}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearChat}
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.expense} />
          </TouchableOpacity>
        )}
        {messages.length === 0 && (
          <Ionicons name="sparkles" size={24} color={COLORS.primary} />
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        style={styles.messagesContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={isLoading ? renderLoadingIndicator : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about your expenses..."
          placeholderTextColor={COLORS.textLight}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
