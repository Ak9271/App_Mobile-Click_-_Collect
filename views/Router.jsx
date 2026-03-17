import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useUser } from "../contexts/UserContext";

export default function LoginScreen() {
  const user = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(action) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

    if (!emailIsValid) {
      user.toast("Veuillez saisir une adresse e-mail valide");
      return;
    }

    if (normalizedPassword.length < 8) {
      user.toast("Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }

    action(normalizedEmail, normalizedPassword);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Connexion ou inscription</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={styles.buttonContainer}>
        <Button
          title="Se connecter"
          onPress={() => {
            submit(user.login);
          }}
        />
        <Button
          title="S'inscrire"
          onPress={() => {
            submit(user.register);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
