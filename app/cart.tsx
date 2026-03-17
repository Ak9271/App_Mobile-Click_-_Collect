import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../constants/app-theme";
import { useCart } from "../contexts/CartContext";
import { useOrders } from "../contexts/OrdersContext";
import { useUser } from "../contexts/UserContext";
import { BUCKET_PRODUCT_IMAGES, getStorageFileViewUrl } from "../lib/appwrite";

function isRemoteImage(imageId?: string) {
  return !!imageId && /^https?:\/\//i.test(imageId);
}

function extractFileIdFromUrl(url: string) {
  const match = url.match(/\/files\/([^/]+)\/(view|preview|download)/i);
  return match?.[1] || "";
}

function getProductImageUri(imageId?: string) {
  const rawValue = String(imageId || "").trim();
  if (!rawValue) return "";

  if (isRemoteImage(rawValue)) {
    const fileIdFromUrl = extractFileIdFromUrl(rawValue);
    if (fileIdFromUrl) {
      return getStorageFileViewUrl(BUCKET_PRODUCT_IMAGES, fileIdFromUrl);
    }
    return rawValue;
  }

  return getStorageFileViewUrl(BUCKET_PRODUCT_IMAGES, rawValue);
}

export default function CartScreen() {
  const router = useRouter();
  const user = useUser();
  const cart = useCart();
  const orders = useOrders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (user.isMerchant) return <Redirect href="/" />;

  async function confirmOrder() {
    if (isSubmitting || !cart.items.length) return;
    setIsSubmitting(true);
    try {
      const itemsCount = cart.count;
      const totalAmount = cart.total.toFixed(2);
      const created = await orders.createOrdersFromCart({
        clientId: user.current.$id,
        items: cart.items,
      });
      if (created.length) {
        const firstOrderId = created[0]?.$id || "";
        const initialStatus = created[0]?.statusLabel || "En attente";
        const orderIds = created
          .map((item: { $id?: string }) => item.$id)
          .filter(Boolean)
          .join(",");

        cart.clear();
        router.push(
          `/order-confirmation?orderId=${encodeURIComponent(
            firstOrderId,
          )}&orderCount=${created.length}&status=${encodeURIComponent(
            initialStatus,
          )}&items=${itemsCount}&total=${encodeURIComponent(
            totalAmount,
          )}&ids=${encodeURIComponent(orderIds)}` as never,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FlatList
      data={cart.items}
      keyExtractor={(item) => item.$id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <View style={styles.topBar}>
            <View style={styles.iconButton}>
              <Feather
                name="shopping-cart"
                size={17}
                color={AppTheme.colors.text}
              />
            </View>
            <View style={styles.iconButton}>
              <Feather
                name="credit-card"
                size={16}
                color={AppTheme.colors.text}
              />
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Resume de commande</Text>
            <Text style={styles.summaryTotal}>{cart.total.toFixed(2)} EUR</Text>
            <Text style={styles.summaryText}>
              {cart.count} article(s) prets pour retrait en magasin
            </Text>
          </View>
          <Text style={styles.title}>Mon panier</Text>
          <Text style={styles.subtitle}>
            Revoyez vos articles avant validation
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.itemRow}>
            {getProductImageUri(item.imageId || item.image_id) ? (
              <Image
                source={{
                  uri: getProductImageUri(item.imageId || item.image_id),
                }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : (
              <View style={styles.thumb}>
                <Feather
                  name="image"
                  size={18}
                  color={AppTheme.colors.textSubtle}
                />
              </View>
            )}
            <View style={styles.itemBody}>
              <Text style={styles.name}>{item.name || item.productName}</Text>
              <Text style={styles.price}>
                {Number(item.priceValue || item.price).toFixed(2)} EUR
              </Text>
              <View style={styles.qtyRow}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => cart.decrease(item.$id)}
                >
                  <Text style={styles.qtyText}>-</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => cart.increase(item.$id)}
                >
                  <Text style={styles.qtyText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.pressed,
            ]}
            onPress={() => cart.remove(item.$id)}
          >
            <Text style={styles.removeButtonText}>Supprimer</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptyText}>
            Ajoutez des produits depuis le catalogue pour commencer.
          </Text>
        </View>
      }
      ListFooterComponent={
        <View style={styles.footerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
            onPress={cart.clear}
          >
            <Text style={styles.clearButtonText}>Vider le panier</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              (isSubmitting || !cart.items.length) && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={confirmOrder}
          >
            <Text style={styles.confirmButtonText}>
              {isSubmitting ? "Validation..." : "Valider la commande"}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    paddingBottom: 32,
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
  summaryCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  summaryEyebrow: {
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryTotal: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: "800",
    color: AppTheme.colors.text,
  },
  summaryText: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: AppTheme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 14,
    color: AppTheme.colors.textMuted,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  itemRow: {
    flexDirection: "row",
    gap: 14,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  price: {
    marginTop: 6,
    color: AppTheme.colors.accent,
    fontWeight: "700",
  },
  qtyRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
    fontSize: 18,
  },
  qtyValue: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  removeButton: {
    marginTop: 14,
    backgroundColor: AppTheme.colors.dangerSoft,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#b026ff",
    fontWeight: "700",
  },
  footerActions: {
    marginTop: 8,
    gap: 10,
  },
  clearButton: {
    backgroundColor: AppTheme.colors.surface,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  clearButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  confirmButton: {
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: AppTheme.colors.accentText,
    fontWeight: "700",
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
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
});
