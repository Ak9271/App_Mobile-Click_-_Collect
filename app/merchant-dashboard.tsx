import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { MerchantBottomNav } from "../components/merchant-bottom-nav";
import { AppTheme } from "../constants/app-theme";
import { useOrders } from "../contexts/OrdersContext";
import { useProducts } from "../contexts/ProductsContext";
import { useUser } from "../contexts/UserContext";

type MerchantProduct = {
  priceValue?: number;
};

type MerchantOrder = {
  status?: string;
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Feather name={icon} size={16} color="#b026ff" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function MerchantDashboardScreen() {
  const user = useUser();
  const orders = useOrders();
  const products = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      products.fetchByMerchant(user.current.$id, false);
      orders.fetchMerchantOrders(user.current.$id, undefined, false);
    }, [orders, products, user]),
  );

  async function handleRefresh() {
    if (!user.current) return;
    setRefreshing(true);
    try {
      await Promise.all([
        products.fetchByMerchant(user.current.$id, true),
        orders.fetchMerchantOrders(user.current.$id, undefined, true),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const productItems = products.products as MerchantProduct[];
  const orderItems = orders.orders as MerchantOrder[];

  const pending = useMemo(
    () => orderItems.filter((item) => item.status === "pending").length,
    [orderItems],
  );
  const ready = useMemo(
    () => orderItems.filter((item) => item.status === "ready").length,
    [orderItems],
  );
  const done = useMemo(
    () => orderItems.filter((item) => item.status === "done").length,
    [orderItems],
  );
  const catalogValue = useMemo(
    () =>
      productItems.reduce((sum, item) => sum + Number(item.priceValue || 0), 0),
    [productItems],
  );

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (!user.isMerchant) return <Redirect href="/products" />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppTheme.colors.accent}
          />
        }
      >
        <Text style={styles.title}>Tableau de bord</Text>

        <View style={styles.grid}>
          <StatCard
            icon="shopping-bag"
            label="Catalogue"
            value={String(productItems.length)}
          />
          <StatCard
            icon="file-text"
            label="Commandes"
            value={String(orderItems.length)}
          />
          <StatCard icon="clock" label="En attente" value={String(pending)} />
          <StatCard icon="check-circle" label="Pretes" value={String(ready)} />
          <StatCard icon="download" label="Retirees" value={String(done)} />
          <StatCard
            icon="dollar-sign"
            label="Valeur"
            value={`${catalogValue.toFixed(2)} EUR`}
          />
        </View>
      </ScrollView>

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
  title: {
    color: AppTheme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  statCard: {
    width: "48.3%",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(37, 175, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    marginTop: 4,
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
});
