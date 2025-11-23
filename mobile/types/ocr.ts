// src/types/ocr.ts (or similar)
export type GeminiOcrPayload = {
  name: string;
  total: number;
  category: "food" | "shopping" | "transportation" | "entertainment" | "bills" | "income" | "other";
};

export type GeminiOcrResponse = {
  success: boolean;
  text?: GeminiOcrPayload;
  message?: string;
};
