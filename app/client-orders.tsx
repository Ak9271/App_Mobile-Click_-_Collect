import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../constants/app-theme";
import { useOrders } from "../contexts/OrdersContext";
import { useUser } from "../contexts/UserContext";

const STATUS_COLORS = {
  pending: "#b026ff",
  ready: "#b026ff",
  done: "#b026ff",
} as const;

type OrderStatus = keyof typeof STATUS_COLORS;

export default function ClientOrdersScreen() {
  const user = useUser();
  const orders = useOrders();

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      orders.fetchClientOrders(user.current.$id);
    }, [orders, user]),
  );

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (user.isMerchant) return <Redirect href="/" />;

  return (
    <FlatList
      data={orders.orders}
      keyExtractor={(item) => item.$id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <View style={styles.topBar}>
            <View style={styles.iconButton}>
              <Feather name="clock" size={18} color={AppTheme.colors.text} />
            </View>
            <View style={styles.iconButton}>
              <Feather name="truck" size={16} color={AppTheme.colors.text} />
            </View>
          </View>
          <Text style={styles.title}>Suivi de mes commandes</Text>
          <Text style={styles.subtitle}>
            Retrouvez chaque commande et son avancement en temps reel.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.id}>Commande #{item.$id.slice(0, 8)}</Text>
          <Text style={styles.meta}>Marchand: {item.merchant_id}</Text>
          <Text style={styles.meta}>
            Date de creation: {new Date(item.$createdAt).toLocaleString()}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  STATUS_COLORS[(item.status as OrderStatus) || "pending"] ||
                  "#d7b8ff",
              },
            ]}
          >
            <Text style={styles.badgeText}>{item.statusLabel}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptyText}>
            Vos commandes apparaitront ici apres validation du panier.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: AppTheme.colors.text,
    marginBottom: 6,
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  id: {
    fontWeight: "700",
    color: AppTheme.colors.text,
    fontSize: 16,
  },
  meta: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
  badge: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: AppTheme.colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
});
