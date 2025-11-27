import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import { useState, useEffect } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { styles } from "../../assets/styles/auth.styles";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const doSignOut = async () => {
      try {
        await signOut();
      } catch (err) {
        console.log("Error signing out on mount:", err);
      }
    };
    doSignOut();
  }, []);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const cleanEmail = emailAddress.trim();
      const cleanPassword = password.trim();
      
      console.log("Attempting sign-in with:", cleanEmail);
      console.log("Attempting sign-in with:", cleanPassword);
      
      const signInAttempt = await signIn.create({
        identifier: cleanEmail,
        password: cleanPassword,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else if (signInAttempt.status === "needs_second_factor") {
        console.error("Sign-in status: needs_second_factor");
        console.log("Supported 2nd Factors:", JSON.stringify(signInAttempt.supportedSecondFactors, null, 2));
        setError("Clerk requires 2FA. Check logs for supported factors.");
      } else {
        console.error("Sign-in status not complete:", signInAttempt.status);
        setError(`Sign-in incomplete. Status: ${signInAttempt.status}`);
      }
    } catch (err) {
      console.error("Sign-in error object:", err);
      if (err.message) {
        console.error("Sign-in error message:", err.message);
      }
      console.error("Sign-in error stringified:", JSON.stringify(err, null, 2));
      const errorString = JSON.stringify(err);
      
      if (err.errors?.[0]?.code === "form_password_incorrect") {
        setError("Password is incorrect. Please try again.");
      } else if (err.errors?.[0]?.code === "form_identifier_not_found") {
        setError("Email not found. Please sign up.");
      } else if (err.errors?.[0]?.code === "form_param_format_invalid") {
        setError("Invalid email format.");
      } else if (errorString.includes("session_exists")) {
        console.log("Session exists detected, redirecting...");
        router.replace("/");
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={30}
    >
      <View style={styles.container}>
        <Image source={require("../../assets/images/revenue-i4.png")} style={styles.illustration} />
        <Text style={styles.title}>Welcome Back</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={COLORS.expense} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, error && styles.errorInput]}
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Enter email"
          placeholderTextColor="#9A8478"
          onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
        />

        <TextInput
          style={[styles.input, error && styles.errorInput]}
          value={password}
          placeholder="Enter password"
          placeholderTextColor="#9A8478"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />

        <TouchableOpacity style={styles.button} onPress={onSignInPress}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>

          <Link href="/sign-up" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
