import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { MerchantBottomNav } from "../components/merchant-bottom-nav";
import { AppTheme } from "../constants/app-theme";
import { useOrders } from "../contexts/OrdersContext";
import { useUser } from "../contexts/UserContext";

export default function MerchantOrdersScreen() {
  const user = useUser();
  const orders = useOrders();
  const params = useLocalSearchParams();
  const initialFilter = params.mode === "history" ? "done" : "pending";
  const [filter, setFilter] = useState(initialFilter);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      orders.fetchMerchantOrders(
        user.current.$id,
        filter === "all" ? undefined : filter,
        false,
      );
    }, [filter, orders, user]),
  );

  async function handleRefresh() {
    if (!user.current) return;
    setRefreshing(true);
    try {
      await orders.fetchMerchantOrders(
        user.current.$id,
        filter === "all" ? undefined : filter,
        true,
      );
    } finally {
      setRefreshing(false);
    }
  }

  const screenTitle = useMemo(() => {
    if (filter === "done") return "Historique des ventes";
    if (filter === "ready") return "Commandes pretes";
    if (filter === "all") return "Toutes les commandes";
    return "Commandes en attente";
  }, [filter]);

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (!user.isMerchant) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={orders.orders}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppTheme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <View style={styles.iconButton}>
                <Feather
                  name="package"
                  size={18}
                  color={AppTheme.colors.text}
                />
              </View>
              <View style={styles.iconButton}>
                <Feather
                  name="check-circle"
                  size={16}
                  color={AppTheme.colors.text}
                />
              </View>
            </View>
            <Text style={styles.title}>{screenTitle}</Text>
            <View style={styles.filters}>
              {[
                { key: "pending", label: "En attente" },
                { key: "ready", label: "Pretes" },
                { key: "done", label: "Terminees" },
                { key: "all", label: "Toutes" },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.filterButton,
                    filter === item.key && styles.filterButtonActive,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setFilter(item.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item.key && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.id}>Commande #{item.$id.slice(0, 8)}</Text>
            <Text style={styles.meta}>Client: {item.client_id}</Text>
            <Text style={styles.meta}>Statut: {item.statusLabel}</Text>
            <Text style={styles.meta}>
              Cree le: {new Date(item.$createdAt).toLocaleString()}
            </Text>
            <View style={styles.actionsRow}>
              {item.status !== "ready" && item.status !== "done" && (
                <Pressable
                  style={({ pressed }) => [
                    styles.readyButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => orders.updateOrderStatus(item.$id, "ready")}
                >
                  <Text style={styles.readyButtonText}>Marquer prete</Text>
                </Pressable>
              )}
              {item.status !== "done" && (
                <Pressable
                  style={({ pressed }) => [
                    styles.doneButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => orders.updateOrderStatus(item.$id, "done")}
                >
                  <Text style={styles.doneButtonText}>Marquer terminee</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptyText}>
              La file vendeur apparaitra ici des qu&apos;une commande sera
              recue.
            </Text>
          </View>
        }
      />
      <MerchantBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 110,
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
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  filterText: {
    color: AppTheme.colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
  filterTextActive: {
    color: AppTheme.colors.accentText,
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  readyButton: {
    flex: 1,
    backgroundColor: AppTheme.colors.successSoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  readyButtonText: {
    color: "#b026ff",
    fontWeight: "700",
    fontSize: 12,
  },
  doneButton: {
    flex: 1,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: AppTheme.colors.accentText,
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
  pressed: {
    opacity: 0.82,
  },
});
