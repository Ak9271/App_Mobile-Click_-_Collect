import { Feather } from "@expo/vector-icons";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../constants/app-theme";
import { useUser } from "../contexts/UserContext";

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderCount?: string;
    status?: string;
    items?: string;
    total?: string;
  }>();
  const user = useUser();

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (user.isMerchant) return <Redirect href="/products" />;

  const orderId = String(params.orderId || "").trim();
  const orderCount = Number(params.orderCount || "1") || 1;
  const initialStatus = String(params.status || "En attente").trim();
  const itemsCount = Number(params.items || "0") || 0;
  const totalAmount = String(params.total || "0.00").trim();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Feather
            name="check-circle"
            size={30}
            color={AppTheme.colors.accent}
          />
        </View>

        <Text style={styles.title}>Commande confirmee</Text>
        <Text style={styles.subtitle}>
          Votre commande a bien ete enregistree pour retrait en magasin.
        </Text>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Numero de commande</Text>
          <Text style={styles.detailValue}>
            {orderId ? `#${orderId.slice(0, 8)}` : "En cours de generation"}
          </Text>

          <Text style={styles.detailLabel}>Statut initial</Text>
          <Text style={styles.detailValue}>{initialStatus}</Text>

          <Text style={styles.detailLabel}>Resume</Text>
          <Text style={styles.detailValue}>
            {itemsCount} article(s) - {totalAmount} EUR
          </Text>

          <Text style={styles.detailMuted}>
            {orderCount > 1
              ? `${orderCount} commandes ont ete creees (une par commercant).`
              : "1 commande a ete creee."}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace("/client-orders")}
        >
          <Text style={styles.primaryButtonText}>Voir mes commandes</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace("/products")}
        >
          <Text style={styles.secondaryButtonText}>Retour au catalogue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
  },
  iconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surface,
    alignSelf: "center",
  },
  title: {
    marginTop: 14,
    textAlign: "center",
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    color: AppTheme.colors.textMuted,
    lineHeight: 20,
  },
  detailBox: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
    gap: 5,
  },
  detailLabel: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailValue: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  detailMuted: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: AppTheme.colors.accentText,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.86,
  },
});
