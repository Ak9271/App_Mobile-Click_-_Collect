import { Image } from "expo-image";
import { Platform, StyleSheet } from "react-native";

import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Collapsible } from "@/components/ui/collapsible";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#050805", dark: "#050805" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#d7b8ff"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}
        >
          Explorer
        </ThemedText>
      </ThemedView>
      <ThemedText>
        Cette application inclut du code exemple pour vous aider a demarrer.
      </ThemedText>
      <Collapsible title="Routage base sur les fichiers">
        <ThemedText>
          Cette application contient deux ecrans :{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{" "}
          et{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          Le fichier de mise en page dans{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{" "}
          configure le navigateur d&apos;onglets.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">En savoir plus</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Compatibilite Android, iOS et web">
        <ThemedText>
          Vous pouvez ouvrir ce projet sur Android, iOS et le web. Pour ouvrir
          la version web, appuyez sur{" "}
          <ThemedText type="defaultSemiBold">w</ThemedText> dans le terminal qui
          execute ce projet.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Images">
        <ThemedText>
          Pour les images statiques, vous pouvez utiliser les suffixes{" "}
          <ThemedText type="defaultSemiBold">@2x</ThemedText> et{" "}
          <ThemedText type="defaultSemiBold">@3x</ThemedText> pour fournir des
          fichiers adaptes aux differentes densites d&apos;ecran.
        </ThemedText>
        <Image
          source={require("@/assets/images/react-logo.png")}
          style={{ width: 100, height: 100, alignSelf: "center" }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">En savoir plus</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Composants mode clair et sombre">
        <ThemedText>
          Ce modele prend en charge les modes clair et sombre. Le hook{" "}
          <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText>
          permet de connaitre le theme actif de l&apos;utilisateur et
          d&apos;adapter les couleurs de l&apos;interface.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link">En savoir plus</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Animations">
        <ThemedText>
          Ce modele inclut un exemple de composant anime. Le composant{" "}
          <ThemedText type="defaultSemiBold">
            components/HelloWave.tsx
          </ThemedText>{" "}
          utilise la bibliotheque{" "}
          <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
            react-native-reanimated
          </ThemedText>{" "}
          pour creer une animation de main qui salue.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              Le composant{" "}
              <ThemedText type="defaultSemiBold">
                components/ParallaxScrollView.tsx
              </ThemedText>{" "}
              fournit un effet de parallaxe pour l&apos;image d&apos;en-tete.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#d7b8ff",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
