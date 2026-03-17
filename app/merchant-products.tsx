import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
    Redirect,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { ID, Permission, Role } from "react-native-appwrite";
import { MerchantBottomNav } from "../components/merchant-bottom-nav";
import { AppTheme } from "../constants/app-theme";
import { useProducts } from "../contexts/ProductsContext";
import { useUser } from "../contexts/UserContext";
import {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    BUCKET_PRODUCT_IMAGES,
    getStorageFileViewUrl,
    storage,
} from "../lib/appwrite";
import { toast } from "../lib/toast";

type MerchantProduct = {
  $id: string;
  name: string;
  description?: string;
  category?: string;
  stockStatus?: "en_stock" | "rupture";
  inStock?: boolean;
  priceValue: number;
  imageId?: string;
};

type FilterKey = "all" | "recent" | "premium" | "with-image";

type ProductCategory = "neuf" | "reconditionne";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "recent", label: "Recents" },
  { key: "premium", label: "Haut de gamme" },
  { key: "with-image", label: "Avec image" },
];

const CATEGORY_OPTIONS: { key: ProductCategory; label: string }[] = [
  { key: "neuf", label: "Neuf" },
  { key: "reconditionne", label: "Reconditionne" },
];

function getCategoryLabel(value?: string) {
  return value === "reconditionne" ? "Reconditionne" : "Neuf";
}

function getTag(product: MerchantProduct) {
  if (product.priceValue >= 100) return "Haut de gamme";
  if (product.imageId) return "Visuel";
  return "Standard";
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

async function resolveUploadSize(asset: ImagePicker.ImagePickerAsset) {
  if (typeof asset.fileSize === "number" && asset.fileSize > 0) {
    return asset.fileSize;
  }

  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    if (blob.size > 0) return blob.size;
  } catch {
    // Ignore and fallback to final guard below.
  }

  return 0;
}

async function uploadImageOnWeb(
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
) {
  const fileId = ID.unique();
  const fileName = asset.fileName || `product-${Date.now()}.jpg`;
  const webFile = (asset as any).file as File | undefined;
  const formData = new FormData();

  formData.append("fileId", fileId);

  if (webFile) {
    formData.append("file", webFile, webFile.name || fileName);
  } else {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    formData.append("file", blob, fileName);
  }

  formData.append("permissions[]", Permission.read(Role.any()));
  formData.append("permissions[]", Permission.update(Role.user(userId)));
  formData.append("permissions[]", Permission.delete(Role.user(userId)));

  const response = await fetch(
    `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_PRODUCT_IMAGES}/files`,
    {
      method: "POST",
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      },
      credentials: "include",
      body: formData,
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || `Envoi de l'image impossible (${response.status})`,
    );
  }

  return payload;
}

function ProductArtwork({ product }: { product: MerchantProduct }) {
  const imageUri = getProductImageUri(product.imageId);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.cardImage}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={styles.cardImageFallback}>
      <View style={styles.cardImageBadge}>
        <Feather name="image" size={18} color="#b026ff" />
      </View>
      <Text style={styles.cardImageLetter}>
        {(product.name || "P").charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function MerchantProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useUser();
  const products = useProducts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("neuf");
  const [stockStatus, setStockStatus] = useState<"en_stock" | "rupture">(
    "en_stock",
  );
  const [price, setPrice] = useState("");
  const [imageId, setImageId] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.open === "create") {
      resetForm();
      setEditorOpen(true);
    }
  }, [params.open]);

  useFocusEffect(
    useCallback(() => {
      if (!user.current) return;
      products.fetchByMerchant(user.current.$id, false);
    }, [products, user]),
  );

  async function handleRefresh() {
    if (!user.current) return;
    setRefreshing(true);
    try {
      await products.fetchByMerchant(user.current.$id, true);
    } finally {
      setRefreshing(false);
    }
  }

  const merchantProducts = products.products as MerchantProduct[];

  const canSave = useMemo(
    () => name.trim().length > 0 && Number(price) > 0,
    [name, price],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return merchantProducts.filter((item, index) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        getCategoryLabel(item.category).toLowerCase().includes(term) ||
        getTag(item).toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (selectedFilter === "with-image") return !!item.imageId;
      if (selectedFilter === "premium") return Number(item.priceValue) >= 100;
      if (selectedFilter === "recent") return index < 6;

      return true;
    });
  }, [merchantProducts, search, selectedFilter]);

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;
  if (!user.isMerchant) return <Redirect href="/products" />;

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setCategory("neuf");
    setStockStatus("en_stock");
    setPrice("");
    setImageId("");
  }

  function handleAccountPress() {
    router.push("/profile");
  }

  function openEdit(product: MerchantProduct) {
    setEditingId(product.$id);
    setName(product.name || "");
    setDescription(product.description || "");
    setCategory(
      product.category === "reconditionne" ? "reconditionne" : "neuf",
    );
    setStockStatus(product.stockStatus === "rupture" ? "rupture" : "en_stock");
    setPrice(String(product.priceValue || ""));
    setImageId(product.imageId || "");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    resetForm();
  }

  async function saveProduct() {
    if (!canSave) return;

    if (editingId) {
      await products.updateProduct(editingId, {
        name,
        description,
        category,
        stockStatus,
        price: Number(price),
        imageId,
      });
      closeEditor();
      return;
    }

    await products.createProduct({
      name,
      description,
      category,
      stockStatus,
      price: Number(price),
      imageId,
      merchantId: user.current.$id,
    });
    closeEditor();
  }

  async function pickAndUploadImage() {
    if (!user.current || isUploadingImage) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast("Autorisez l'acces photos pour ajouter une image");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setIsUploadingImage(true);

    try {
      const uploaded =
        Platform.OS === "web"
          ? await uploadImageOnWeb(asset, user.current.$id)
          : await (async () => {
              const uploadSize = await resolveUploadSize(asset);
              if (!uploadSize) {
                throw new Error("Impossible de lire le fichier image");
              }

              return storage.createFile({
                bucketId: BUCKET_PRODUCT_IMAGES,
                fileId: ID.unique(),
                file: {
                  uri: asset.uri,
                  name: asset.fileName || `product-${Date.now()}.jpg`,
                  type: asset.mimeType || "image/jpeg",
                  size: uploadSize,
                },
                permissions: [
                  Permission.read(Role.any()),
                  Permission.update(Role.user(user.current.$id)),
                  Permission.delete(Role.user(user.current.$id)),
                ],
              });
            })();

      setImageId(uploaded.$id);
      toast("Image ajoutee");
    } catch (error: any) {
      toast(error?.message || "Envoi de l'image impossible");
      console.error("Upload image error", error);
    } finally {
      setIsUploadingImage(false);
    }
  }

  const editorImageUri = getProductImageUri(imageId);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={AppTheme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headerBar}>
              <View style={styles.headerSpacer} />
              <Text style={styles.brandTitle}>Tiktokshop</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.accountHeaderButton,
                  pressed && styles.pressed,
                ]}
                onPress={handleAccountPress}
              >
                <Feather name="user" size={18} color="#ffffff" />
              </Pressable>
            </View>

            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="#d7b8ff" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un produit..."
                placeholderTextColor="#d7b8ff"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <FlatList
              data={FILTERS}
              horizontal
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item }) => {
                const active = selectedFilter === item.key;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.filterChip,
                      active && styles.filterChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setSelectedFilter(item.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <ProductArtwork product={item} />

            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>
                  {Number(item.priceValue).toFixed(2)} EUR
                </Text>
              </View>

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
                  {item.stockStatus === "rupture"
                    ? "Rupture de stock"
                    : "En stock"}
                </Text>
              </View>

              <Text style={styles.productSubtitle}>
                {`${getCategoryLabel(item.category)} - `}
                {item.description?.trim()
                  ? item.description
                  : item.imageId
                    ? "Produit avec visuel, pret a etre mis en avant."
                    : "Ajoutez une description et une image pour un rendu plus vendeur."}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.actionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.editButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => openEdit(item)}
                  >
                    <Feather name="edit-3" size={16} color="#b026ff" />
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => products.removeProduct(item.$id)}
                  >
                    <Feather name="trash-2" size={16} color="#b026ff" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun produit a afficher</Text>
            <Text style={styles.emptyText}>
              Ajoutez votre premier article pour remplir le catalogue vendeur.
            </Text>
          </View>
        }
      />
      <MerchantBottomNav />

      <Modal visible={editorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? "Modifier le produit" : "Ajouter un produit"}
              </Text>
              <Pressable
                style={({ pressed }) => [pressed && styles.pressed]}
                onPress={closeEditor}
              >
                <Feather name="x" size={22} color={AppTheme.colors.text} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom du produit"
              placeholderTextColor="#d7b8ff"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Prix"
              placeholderTextColor="#d7b8ff"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
            <View style={styles.categorySelectorRow}>
              {CATEGORY_OPTIONS.map((option) => {
                const active = category === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={({ pressed }) => [
                      styles.categorySelectorButton,
                      active && styles.categorySelectorButtonActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setCategory(option.key)}
                  >
                    <Text
                      style={[
                        styles.categorySelectorText,
                        active && styles.categorySelectorTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.stockSelectorRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.stockSelectorButton,
                  stockStatus === "en_stock" &&
                    styles.stockSelectorButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => setStockStatus("en_stock")}
              >
                <Text
                  style={[
                    styles.stockSelectorText,
                    stockStatus === "en_stock" &&
                      styles.stockSelectorTextActive,
                  ]}
                >
                  En stock
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.stockSelectorButton,
                  stockStatus === "rupture" && styles.stockSelectorButtonDanger,
                  pressed && styles.pressed,
                ]}
                onPress={() => setStockStatus("rupture")}
              >
                <Text
                  style={[
                    styles.stockSelectorText,
                    stockStatus === "rupture" && styles.stockSelectorTextActive,
                  ]}
                >
                  Rupture
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Description"
              placeholderTextColor="#d7b8ff"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.imagePickerBlock}>
              {editorImageUri ? (
                <Image
                  source={{ uri: editorImageUri }}
                  style={styles.editorPreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.editorPreviewEmpty}>
                  <Feather name="image" size={20} color="#b026ff" />
                  <Text style={styles.editorPreviewEmptyText}>
                    Aucune image selectionnee
                  </Text>
                </View>
              )}

              <View style={styles.imagePickerActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.imagePickerButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={pickAndUploadImage}
                >
                  <Feather name="image" size={16} color="#ffffff" />
                  <Text style={styles.imagePickerButtonText}>
                    {isUploadingImage
                      ? "Televersement en cours..."
                      : "Choisir une image"}
                  </Text>
                </Pressable>

                {!!imageId && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.clearImageButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setImageId("")}
                  >
                    <Text style={styles.clearImageButtonText}>Supprimer</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondary,
                  pressed && styles.pressed,
                ]}
                onPress={closeEditor}
              >
                <Text style={styles.modalSecondaryText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimary,
                  (!canSave || isUploadingImage) && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={saveProduct}
                disabled={!canSave || isUploadingImage}
              >
                <Text style={styles.modalPrimaryText}>
                  {editingId ? "Enregistrer" : "Creer"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050805",
  },
  container: {
    paddingBottom: 110,
  },
  headerBlock: {
    backgroundColor: AppTheme.colors.background,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 12,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1d1030",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 16,
  },
  filterRow: {
    paddingTop: 14,
    paddingBottom: 2,
    gap: 10,
  },
  filterChip: {
    backgroundColor: "#1d1030",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#b026ff",
  },
  filterChipText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#1d1030",
    borderRadius: 28,
    marginHorizontal: 14,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#050805",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 248,
    backgroundColor: "#1d1030",
  },
  cardImageFallback: {
    width: "100%",
    height: 248,
    backgroundColor: "#1d1030",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardImageBadge: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageLetter: {
    color: "#ffffff",
    fontSize: 72,
    fontWeight: "800",
  },
  cardBody: {
    padding: 18,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  productName: {
    flex: 1,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  productPrice: {
    color: "#b026ff",
    fontSize: 18,
    fontWeight: "800",
  },
  stockBadge: {
    marginTop: 10,
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
    color: "#a6ffce",
  },
  stockBadgeTextOut: {
    color: "#ffb3b3",
  },
  productSubtitle: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 21,
  },
  cardFooter: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1d1030",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
  },
  editButtonText: {
    color: "#b026ff",
    fontWeight: "800",
    fontSize: 15,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#1d1030",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    backgroundColor: "#1d1030",
    borderRadius: 24,
    padding: 26,
    marginHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#ffffff",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(14, 24, 38, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: AppTheme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  input: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: AppTheme.colors.text,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 10,
  },
  descriptionInput: {
    minHeight: 90,
  },
  categorySelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  categorySelectorButton: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  categorySelectorButtonActive: {
    backgroundColor: "rgba(176, 38, 255, 0.24)",
    borderColor: "rgba(176, 38, 255, 0.62)",
  },
  categorySelectorText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  categorySelectorTextActive: {
    color: AppTheme.colors.text,
  },
  stockSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  stockSelectorButton: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  stockSelectorButtonActive: {
    backgroundColor: "rgba(60, 220, 130, 0.22)",
    borderColor: "rgba(60, 220, 130, 0.6)",
  },
  stockSelectorButtonDanger: {
    backgroundColor: "rgba(255, 106, 106, 0.22)",
    borderColor: "rgba(255, 106, 106, 0.6)",
  },
  stockSelectorText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  stockSelectorTextActive: {
    color: AppTheme.colors.text,
  },
  imagePickerBlock: {
    marginBottom: 10,
  },
  editorPreview: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceAlt,
    marginBottom: 10,
  },
  editorPreviewEmpty: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceAlt,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editorPreviewEmptyText: {
    color: AppTheme.colors.text,
    fontWeight: "600",
  },
  imagePickerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
    backgroundColor: "#b026ff",
    borderRadius: 14,
    paddingVertical: 12,
  },
  imagePickerButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  clearImageButton: {
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clearImageButtonText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalSecondary: {
    flex: 1,
    backgroundColor: AppTheme.colors.surfaceAlt,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  modalPrimary: {
    flex: 1,
    backgroundColor: "#b026ff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
