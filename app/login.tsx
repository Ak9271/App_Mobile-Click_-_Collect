import { Redirect } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useUser } from "../contexts/UserContext";
import { toast } from "../lib/toast";

type AuthMode = "signin" | "signup";
type AccountRole = "client" | "merchant";

export default function Login() {
  const user = useUser();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AccountRole>("client");
  const [loading, setLoading] = useState(false);

  if (!user.isLoaded) return null;
  if (user.current) {
    return (
      <Redirect href={user.isMerchant ? "/merchant-products" : "/products"} />
    );
  }

  function validateSignIn() {
    if (!email.trim()) {
      toast("Email requis");
      return false;
    }

    if (!password) {
      toast("Mot de passe requis");
      return false;
    }

    return true;
  }

  function validateSignUp() {
    if (!email.trim()) {
      toast("Email requis");
      return false;
    }

    if (password.length < 8) {
      toast("Mot de passe: minimum 8 caracteres");
      return false;
    }

    if (!name.trim()) {
      toast("Nom complet requis");
      return false;
    }

    return true;
  }

  async function onLogin() {
    if (loading || !validateSignIn()) return;

    setLoading(true);
    try {
      await user.login(email.trim(), password);
    } catch (error: any) {
      toast(error?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    if (loading || !validateSignUp()) return;

    setLoading(true);
    try {
      await user.register(email.trim(), password, role, name.trim());
    } catch (error: any) {
      toast(error?.message || "Creation du compte impossible");
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.phoneCard}>
          <Text style={styles.screenTitle}>
            {isSignUp ? "Creer\nun compte" : "Bon\nretour"}
          </Text>

          <View style={styles.modeSwitch}>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                !isSignUp && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setMode("signin")}
            >
              <Text
                style={[styles.modeText, !isSignUp && styles.modeTextActive]}
              >
                Connexion
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                isSignUp && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={() => setMode("signup")}
            >
              <Text
                style={[styles.modeText, isSignUp && styles.modeTextActive]}
              >
                Inscription
              </Text>
            </Pressable>
          </View>

          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Nom complet"
              placeholderTextColor="#d7b8ff"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#d7b8ff"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#d7b8ff"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {isSignUp && (
            <>
              <View style={styles.roleRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    role === "client" && styles.roleButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setRole("client")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "client" && styles.roleTextActive,
                    ]}
                  >
                    Compte client
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleButton,
                    role === "merchant" && styles.roleButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setRole("merchant")}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === "merchant" && styles.roleTextActive,
                    ]}
                  >
                    Compte marchand
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Le mot de passe doit contenir au moins 8 caracteres
              </Text>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={isSignUp ? onRegister : onLogin}
          >
            {loading ? (
              <ActivityIndicator color="#050805" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? "S'inscrire" : "Se connecter"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setMode(isSignUp ? "signin" : "signup")}
          >
            <Text style={styles.secondaryButtonText}>
              {isSignUp
                ? "Vous avez deja un compte ? Se connecter"
                : "Pas de compte ? S'inscrire"}
            </Text>
          </Pressable>

          <Text style={styles.footerText}>Se connecter avec</Text>
          <View style={styles.socialRow}>
            <View style={styles.socialDot} />
            <View style={styles.socialDot} />
            <View style={styles.socialDot} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050805",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  phoneCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#160c1c",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#050805",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  screenTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 18,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#1d1030",
  },
  modeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  modeTextActive: {
    color: "#ffffff",
  },
  input: {
    backgroundColor: "#1d1030",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  roleRow: {
    gap: 8,
    marginTop: 2,
    marginBottom: 8,
  },
  roleButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#1d1030",
  },
  roleText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  roleTextActive: {
    color: "#ffffff",
  },
  helperText: {
    color: "#ffffff",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: "#1d1030",
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 2,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  footerText: {
    color: "#ffffff",
    textAlign: "center",
    fontSize: 11,
    marginTop: 16,
    marginBottom: 8,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  socialDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: "#1d1030",
  },
  pressed: {
    opacity: 0.82,
  },
});
