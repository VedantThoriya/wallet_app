import * as ImagePicker from "expo-image-picker";
import { API_URL } from "../constants/api";

export async function openCamera(processImage) {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Camera permission needed");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    await processImage(uri);
  }
}

export async function openGallery(processImage) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    await processImage(uri);
  }
}

export async function processImage(uri) {
  try {
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: "receipt.jpg",
      type: "image/jpeg",
    });

    const response = await fetch(`${API_URL}/ocr/gemini`, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    const json = await response.json();

    console.log("📩 OCR Response:", json);

    return await json;
  } catch (error) {
    console.log("OCR Error:", error);
    return { success: false, message: "OCR failed" };
  }
}
