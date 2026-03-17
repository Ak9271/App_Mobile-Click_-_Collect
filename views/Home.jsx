import { useState } from "react";
import {
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useIdeas } from "../contexts/IdeasContext";
import { useUser } from "../contexts/UserContext";

export default function HomeScreen() {
  const user = useUser();
  const ideas = useIdeas();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return (
    <ScrollView>
      {user.current ? (
        <View style={styles.section}>
          <Text style={styles.header}>Soumettre une idee</Text>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Titre"
              value={title}
              onChangeText={(text) => setTitle(text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={description}
              onChangeText={(text) => setDescription(text)}
            />
            <Button
              title="Envoyer"
              onPress={() =>
                ideas.add({ userId: user.current.$id, title, description })
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text>Veuillez vous connecter pour soumettre une idee.</Text>
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.header}>Dernieres idees</Text>
        <View>
          {ideas.current.map((idea) => (
            <View key={idea.$id} style={styles.card}>
              <Text style={styles.cardTitle}>{idea.title}</Text>
              <Text style={styles.cardDescription}>{idea.description}</Text>
              {/* Show the remove button to idea owner. */}
              {user.current && user.current.$id === idea.userId && (
                <Button
                  title="Supprimer"
                  onPress={() => ideas.remove(idea.$id)}
                />
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    padding: 16,
  },
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
  card: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: "#050805",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
});
