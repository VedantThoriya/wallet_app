import { useState, useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import { Camera } from "react-native-vision-camera";

export default function useCameraPermission() {
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    async function checkPermission() {
      const status = Camera.getCameraPermissionStatus();

      if (status !== "granted") {
        const request = await Camera.requestCameraPermission();
        console.log("Camera permission request result:", request);

        if (request !== "granted") {
          Alert.alert(
            "Permission Required",
            "Camera access is needed to scan receipts.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                },
              },
            ]
          );
          return;
        }
      }

      setPermission("authorized");
    }

    checkPermission();
  }, []);

  return permission === "authorized";
}
