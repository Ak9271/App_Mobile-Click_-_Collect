import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { MerchantBottomNav } from "../components/merchant-bottom-nav";
import { AppTheme } from "../constants/app-theme";
import { useCart } from "../contexts/CartContext";
import { useProducts } from "../contexts/ProductsContext";
import { useUser } from "../contexts/UserContext";
import { BUCKET_PRODUCT_IMAGES, getStorageFileViewUrl } from "../lib/appwrite";

type ProductCardProps = {
  item: any;
  onPress: () => void;
  actionLabel: string;
  disabled?: boolean;
  onAddToCart?: () => void;
  addToCartDisabled?: boolean;
};

function getCategoryLabel(value?: string) {
  return value === "reconditionne" ? "Reconditionne" : "Neuf";
}

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

function ProductCard({
  item,
  onPress,
  actionLabel,
  disabled,
  onAddToCart,
  addToCartDisabled,
}: ProductCardProps) {
  const imageUri = getProductImageUri(item.imageId);

  return (
    <View style={styles.card}>
      <View style={styles.productRow}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
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
        <View style={styles.productBody}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.metaLabel}>
            {getCategoryLabel(item.category)}
          </Text>
          <View
            style={[
              styles.stockBadge,
              item.stockStatus === "rupture"
                ? styles.stockBadgeOut
                : styles.stockBadgeIn,
            ]}
          >
            <Text
              style={[
                styles.stockBadgeText,
                item.stockStatus === "rupture"
                  ? styles.stockBadgeTextOut
                  : styles.stockBadgeTextIn,
              ]}
            >
              {item.stockStatus === "rupture" ? "Rupture de stock" : "En stock"}
            </Text>
          </View>
          <Text style={styles.price}>
            {Number(item.priceValue).toFixed(2)} EUR
          </Text>
          <Text style={styles.metaText}>
            Commercant: {item.merchantId || "-"}
          </Text>
        </View>
      </View>
      {onAddToCart ? (
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSplit,
              disabled && styles.actionButtonDisabled,
              pressed && styles.pressed,
            ]}
            disabled={disabled}
            onPress={onPress}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryActionButton,
              styles.actionButtonSplit,
              addToCartDisabled && styles.actionButtonDisabled,
              pressed && styles.pressed,
            ]}
            disabled={addToCartDisabled}
            onPress={onAddToCart}
          >
            <Text style={styles.secondaryActionText}>Ajouter au panier</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            disabled && styles.actionButtonDisabled,
            pressed && styles.pressed,
          ]}
          disabled={disabled}
          onPress={onPress}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ProductsScreen() {
  const router = useRouter();
  const user = useUser();
  const products = useProducts();
  const cart = useCart();
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  function handleAccountPress() {
    router.push("/profile");
  }

  function handleCartPress() {
    if (user.isMerchant) return;
    router.push("/cart");
  }

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      if (user.isMerchant) {
        products.fetchByMerchant(user.current.$id, false);
      } else {
        products.fetchAll(false);
      }
    }, [products, user]),
  );

  async function handleRefresh() {
    if (!user.current) return;
    setRefreshing(true);
    try {
      if (user.isMerchant) {
        await products.fetchByMerchant(user.current.$id, true);
      } else {
        await products.fetchAll(true);
      }
    } finally {
      setRefreshing(false);
    }
  }

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    const minValue = Number(minPrice.replace(",", "."));
    const maxValue = Number(maxPrice.replace(",", "."));
    const hasMin = minPrice.trim().length > 0 && !Number.isNaN(minValue);
    const hasMax = maxPrice.trim().length > 0 && !Number.isNaN(maxValue);

    return products.products.filter((item: any) => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (user.isMerchant) return true;

      const price = Number(item.priceValue || 0);
      if (hasMin && price < minValue) return false;
      if (hasMax && price > maxValue) return false;
      return true;
    });
  }, [products.products, search, minPrice, maxPrice, user.isMerchant]);

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={data}
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
          <View style={styles.headerBlock}>
            <View style={styles.topBar}>
              <View style={styles.iconButton}>
                <Feather name="menu" size={18} color={AppTheme.colors.text} />
              </View>
              <View style={styles.topBarActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCartPress}
                >
                  <Feather
                    name="shopping-bag"
                    size={16}
                    color={AppTheme.colors.text}
                  />
                  {cart.count > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {cart.count > 9 ? "9+" : cart.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.accountButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleAccountPress}
                >
                  <Feather name="user" size={18} color={AppTheme.colors.text} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.title}>
              {user.isMerchant ? "Mon catalogue" : "Catalogue"}
            </Text>
            <Text style={styles.subtitle}>
              {user.isMerchant
                ? "Retrouvez vos produits et modifiez-les rapidement."
                : "Une liste claire, filtrable, optimisee pour commander vite."}
            </Text>
            <View style={styles.searchBox}>
              <Feather
                name="search"
                size={16}
                color={AppTheme.colors.textSubtle}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un produit"
                placeholderTextColor={AppTheme.colors.textSubtle}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {user.isMerchant ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryPill,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push("/merchant-products" as never)}
              >
                <Text style={styles.primaryPillText}>Gerer mes produits</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.priceRangeRow}>
                  <TextInput
                    style={[styles.searchInput, styles.priceInput]}
                    placeholder="Prix min"
                    placeholderTextColor={AppTheme.colors.textSubtle}
                    keyboardType="decimal-pad"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                  <TextInput
                    style={[styles.searchInput, styles.priceInput]}
                    placeholder="Prix max"
                    placeholderTextColor={AppTheme.colors.textSubtle}
                    keyboardType="decimal-pad"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.priceResetButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  >
                    <Text style={styles.priceResetText}>Reset</Text>
                  </Pressable>
                </View>

                <View style={styles.quickActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryPill,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.push("/cart")}
                  >
                    <Text style={styles.secondaryPillText}>
                      Panier ({cart.count})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryPill,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.push("/client-orders" as never)}
                  >
                    <Text style={styles.primaryPillText}>Mes commandes</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            actionLabel={
              user.isMerchant ? "Modifier dans Mes produits" : "Voir details"
            }
            onPress={() => {
              if (user.isMerchant) {
                router.push("/merchant-products" as never);
                return;
              }
              router.push(`/product-details?id=${item.$id}` as never);
            }}
            onAddToCart={
              user.isMerchant
                ? undefined
                : () => {
                    cart.add(item);
                  }
            }
            addToCartDisabled={
              !user.isMerchant && item.stockStatus === "rupture"
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun produit disponible</Text>
            <Text style={styles.emptyText}>
              Ajoutez un produit ou modifiez votre recherche.
            </Text>
          </View>
        }
      />

      {user.isMerchant && <MerchantBottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  container: {
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    paddingBottom: 110,
  },
  headerBlock: {
    marginBottom: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topBarActions: {
    flexDirection: "row",
    gap: 10,
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
    position: "relative",
  },
  accountButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 99,
    backgroundColor: "#b026ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 14,
  },
  priceRangeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  priceResetButton: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  priceResetText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
    fontSize: 12,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryPill: {
    marginTop: 12,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flex: 1,
  },
  primaryPillText: {
    color: AppTheme.colors.accentText,
    fontWeight: "700",
  },
  secondaryPill: {
    marginTop: 12,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryPillText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  productRow: {
    flexDirection: "row",
    gap: 14,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.backgroundSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  productBody: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  metaLabel: {
    marginTop: 3,
    color: AppTheme.colors.textSubtle,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  stockBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockBadgeIn: {
    backgroundColor: "rgba(60, 220, 130, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(60, 220, 130, 0.45)",
  },
  stockBadgeOut: {
    backgroundColor: "rgba(255, 106, 106, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 106, 106, 0.45)",
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  stockBadgeTextIn: {
    color: "#2f9f67",
  },
  stockBadgeTextOut: {
    color: "#d64a4a",
  },
  price: {
    marginTop: 6,
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  metaText: {
    marginTop: 4,
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  actionButton: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AppTheme.colors.accent,
  },
  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  actionButtonSplit: {
    marginTop: 0,
    flex: 1,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: AppTheme.colors.accentText,
    fontWeight: "700",
  },
  secondaryActionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryActionText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  emptyState: {
    marginTop: 50,
    alignItems: "center",
  },
  emptyTitle: {
    fontWeight: "700",
    color: AppTheme.colors.text,
    fontSize: 17,
  },
  emptyText: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.86,
  },
});
