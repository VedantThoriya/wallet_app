import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../constants/api";

const STORAGE_KEY = "ai_chat_messages_";

export const useAIChat = (userId) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load messages from storage on mount
    useEffect(() => {
        loadMessages();
    }, [userId]);

    // Save messages to storage whenever they change
    useEffect(() => {
        if (messages.length > 0) {
            saveMessages();
        }
    }, [messages]);

    const loadMessages = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY + userId);
            if (stored) {
                const parsedMessages = JSON.parse(stored);
                // Convert timestamp strings back to Date objects
                const messagesWithDates = parsedMessages.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                }));
                setMessages(messagesWithDates);
            }
        } catch (error) {
            console.error("Error loading chat messages:", error);
        }
    };

    const saveMessages = async () => {
        try {
            await AsyncStorage.setItem(
                STORAGE_KEY + userId,
                JSON.stringify(messages)
            );
        } catch (error) {
            console.error("Error saving chat messages:", error);
        }
    };

    const sendMessage = useCallback(async (query) => {
        if (!query.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now().toString(),
            text: query,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/ai/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: userId,
                    query: query,
                }),
            });

            const data = await response.json();

            if (data.success && data.reply) {
                // Add AI response
                const aiMessage = {
                    id: (Date.now() + 1).toString(),
                    text: data.reply,
                    isUser: false,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, aiMessage]);
            } else {
                throw new Error("Failed to get AI response");
            }
        } catch (error) {
            console.error("AI Chat Error:", error);

            // Add error message
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I couldn't process your request. Please try again.",
                isUser: false,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const clearMessages = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY + userId);
            setMessages([]);
        } catch (error) {
            console.error("Error clearing chat messages:", error);
        }
    }, [userId]);

    return {
        messages,
        isLoading,
        sendMessage,
        clearMessages,
    };
};
