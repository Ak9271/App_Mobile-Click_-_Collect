import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
    Redirect,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppTheme } from "../constants/app-theme";
import { useCart } from "../contexts/CartContext";
import { useProducts } from "../contexts/ProductsContext";
import { useUser } from "../contexts/UserContext";
import { BUCKET_PRODUCT_IMAGES, getStorageFileViewUrl } from "../lib/appwrite";

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

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const user = useUser();
  const products = useProducts();
  const cart = useCart();

  const productId = String(params.id || "").trim();

  useFocusEffect(
    useCallback(() => {
      if (!user.current || user.isMerchant) return;
      products.fetchAll(false);
    }, [products, user]),
  );

  const product = useMemo(
    () => products.products.find((item: any) => item.$id === productId),
    [products.products, productId],
  );

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (user.isMerchant) return <Redirect href="/products" />;

  if (!productId || !product) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Produit introuvable</Text>
        <Text style={styles.emptyText}>
          Ce produit n&apos;est plus disponible dans le catalogue.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.replace("/products")}
        >
          <Text style={styles.backButtonText}>Retour au catalogue</Text>
        </Pressable>
      </View>
    );
  }

  const imageUri = getProductImageUri(product.imageId);
  const isOutOfStock = product.stockStatus === "rupture";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.mediaCard}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Feather
              name="image"
              size={26}
              color={AppTheme.colors.textSubtle}
            />
          </View>
        )}
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.category}>
          {getCategoryLabel(product.category)}
        </Text>

        <View
          style={[
            styles.stockBadge,
            isOutOfStock ? styles.stockBadgeOut : styles.stockBadgeIn,
          ]}
        >
          <Text
            style={[
              styles.stockBadgeText,
              isOutOfStock ? styles.stockBadgeTextOut : styles.stockBadgeTextIn,
            ]}
          >
            {isOutOfStock ? "Rupture de stock" : "En stock"}
          </Text>
        </View>

        <Text style={styles.price}>
          {Number(product.priceValue || 0).toFixed(2)} EUR
        </Text>

        <Text style={styles.description}>
          {product.description?.trim() || "Aucune description pour ce produit."}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            isOutOfStock && styles.primaryButtonDisabled,
            pressed && styles.pressed,
          ]}
          disabled={isOutOfStock}
          onPress={() => {
            if (isOutOfStock) return;
            cart.add(product);
            router.push("/cart");
          }}
        >
          <Text style={styles.primaryButtonText}>
            {isOutOfStock ? "Indisponible" : "Ajouter au panier"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppTheme.colors.background,
    padding: 16,
    paddingBottom: 28,
  },
  mediaCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  image: {
    width: "100%",
    height: 280,
  },
  imageFallback: {
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.backgroundSoft,
  },
  contentCard: {
    marginTop: 14,
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  name: {
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  category: {
    marginTop: 6,
    color: AppTheme.colors.textSubtle,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 0.9,
  },
  stockBadge: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: "800",
  },
  stockBadgeTextIn: {
    color: "#2f9f67",
  },
  stockBadgeTextOut: {
    color: "#d64a4a",
  },
  price: {
    marginTop: 12,
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  description: {
    marginTop: 10,
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: AppTheme.colors.accentText,
    fontWeight: "800",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: AppTheme.colors.background,
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 8,
    color: AppTheme.colors.textMuted,
    textAlign: "center",
  },
  backButton: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  backButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
