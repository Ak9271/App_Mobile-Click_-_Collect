import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../constants/app-theme";
import { useOrders } from "../contexts/OrdersContext";
import { useUser } from "../contexts/UserContext";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useUser();
  const orders = useOrders();

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;

  async function handleLogout() {
    await user.logout();
    router.replace("/login");
  }

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      if (user.isMerchant) {
        orders.fetchMerchantOrders(user.current.$id, undefined, false);
        return;
      }
      orders.fetchClientOrders(user.current.$id, false);
    }, [orders, user]),
  );

  const displayName = (user.displayName || "Utilisateur").trim();
  const firstLetter = displayName.charAt(0).toUpperCase() || "U";
  const email = user.current.email || "-";
  const roleLabel = user.isMerchant ? "Commercant" : "Client";
  const orderLabel = user.isMerchant ? "Commandes recues" : "Commandes passees";
  const orderCount = orders.isLoading ? "..." : String(orders.orders.length);
  const createdAt =
    user.profile?.$createdAt ||
    user.current?.$createdAt ||
    new Date().toISOString();
  const createdLabel = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{firstLetter}</Text>
          </View>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.rolePill}>
          <Feather name="shield" size={13} color={AppTheme.colors.accent} />
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Feather name="mail" size={18} color={AppTheme.colors.textSubtle} />
            <Text style={styles.infoLabel}>Email</Text>
          </View>
          <Text style={styles.infoValue}>{email}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Feather
              name="shopping-bag"
              size={18}
              color={AppTheme.colors.textSubtle}
            />
            <Text style={styles.infoLabel}>{orderLabel}</Text>
          </View>
          <Text style={styles.infoValue}>{orderCount}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Feather
              name="user-check"
              size={18}
              color={AppTheme.colors.textSubtle}
            />
            <Text style={styles.infoLabel}>Role</Text>
          </View>
          <Text style={styles.infoValue}>{roleLabel}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Feather
              name="calendar"
              size={18}
              color={AppTheme.colors.textSubtle}
            />
            <Text style={styles.infoLabel}>Inscrit le</Text>
          </View>
          <Text style={styles.infoValue}>{createdLabel}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.pressed,
        ]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color="#ff5a5a" />
        <Text style={styles.logoutButtonText}>Se deconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -50,
    width: 240,
    height: 130,
    borderRadius: 120,
    backgroundColor: "rgba(176,38,255,0.2)",
  },
  avatarRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
    borderColor: "rgba(176,38,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: AppTheme.colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  name: {
    marginTop: 14,
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  email: {
    marginTop: 3,
    color: AppTheme.colors.textMuted,
    fontSize: 16,
  },
  rolePill: {
    marginTop: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  rolePillText: {
    color: AppTheme.colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  detailsCard: {
    marginTop: 14,
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 14,
  },
  infoRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    color: AppTheme.colors.textSubtle,
    fontSize: 15,
    fontWeight: "600",
  },
  infoValue: {
    flex: 1,
    textAlign: "right",
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
  },
  logoutButton: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,90,90,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.35)",
    paddingVertical: 14,
  },
  logoutButtonText: {
    color: "#ff5a5a",
    fontSize: 18,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.85,
  },
});
