export function bufferToGeminiImage(buffer, mimeType = "image/jpeg") {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}
