import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { ID, Query } from "react-native-appwrite";
import { DATABASE_ID, TABLE_PRODUCTS, tablesDB } from "../lib/appwrite";
import { toast } from "../lib/toast";

const ProductsContext = createContext();
const CACHE_TTL_MS = 30_000;

function normalizeCategory(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (raw === "reconditionne") return "reconditionne";
  return "neuf";
}

function normalizeStockStatus(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "rupture" || raw === "out_of_stock") return "rupture";
  if (raw === "false" || raw === "0") return "rupture";
  return "en_stock";
}

function normalizeProduct(row) {
  const resolvedImage =
    row.image_id || row.imageId || row.image || row.Image || "";
  const resolvedCategory =
    row.category || row.Category || row.productCategory || "";
  const resolvedStockStatus =
    row.stock_status || row.stockStatus || row.stock || row.Stock || "";
  const stockStatus = normalizeStockStatus(resolvedStockStatus);

  return {
    ...row,
    name: row.productName || row.name || "Produit",
    description:
      row.description || row.Description || row.productDescription || "",
    category: normalizeCategory(resolvedCategory),
    stockStatus,
    inStock: stockStatus === "en_stock",
    priceValue: Number(row.price || 0),
    merchantId: row.merchant_id || "",
    imageId: String(resolvedImage).trim(),
  };
}

function withDescription(data, value, useUppercase = false) {
  const key = useUppercase ? "Description" : "description";
  return {
    ...data,
    [key]: value,
  };
}

function withCategory(data, value, useUppercase = false) {
  const key = useUppercase ? "Category" : "category";
  return {
    ...data,
    [key]: value,
  };
}

function withStockStatus(data, value, useLegacyKey = false) {
  const key = useLegacyKey ? "stock" : "stock_status";
  return {
    ...data,
    [key]: normalizeStockStatus(value),
  };
}

function isUnknownDescriptionAttribute(error) {
  const message = String(error?.message || "");
  return /Unknown attribute:\s*"description"/i.test(message);
}

function isUnknownCategoryAttribute(error) {
  const message = String(error?.message || "");
  return /Unknown attribute:\s*"category"/i.test(message);
}

function isUnknownStockStatusAttribute(error) {
  const message = String(error?.message || "");
  return (
    /Unknown attribute:\s*"stock_status"/i.test(message) ||
    /Unknown attribute:\s*"stock"/i.test(message)
  );
}

function isRetryableAttributeError(error) {
  return (
    isUnknownDescriptionAttribute(error) ||
    isUnknownCategoryAttribute(error) ||
    isUnknownStockStatusAttribute(error)
  );
}

function buildProductData(
  baseData,
  {
    description,
    category,
    stockStatus,
    useUpperDescription = false,
    useUpperCategory = false,
    includeCategory = true,
    useLegacyStockKey = false,
    includeStockStatus = true,
  },
) {
  let data = withDescription(baseData, description, useUpperDescription);
  if (includeCategory) {
    data = withCategory(data, category, useUpperCategory);
  }
  if (includeStockStatus) {
    data = withStockStatus(data, stockStatus, useLegacyStockKey);
  }
  return data;
}

export function useProducts() {
  return useContext(ProductsContext);
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);
  const [scopeKey, setScopeKey] = useState("");

  function canUseCache(nextScopeKey, forceRefresh = false) {
    if (forceRefresh) return false;
    if (!products.length) return false;
    if (scopeKey !== nextScopeKey) return false;
    return Date.now() - lastFetchedAt < CACHE_TTL_MS;
  }

  const fetchAll = useCallback(
    async (forceRefresh = false) => {
      const nextScopeKey = "all";
      if (canUseCache(nextScopeKey, forceRefresh)) {
        return products;
      }

      setIsLoading(products.length === 0 || forceRefresh);
      try {
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_PRODUCTS,
          queries: [Query.orderDesc("$createdAt")],
        });
        const rows = response.rows.map(normalizeProduct);
        setProducts(rows);
        setScopeKey(nextScopeKey);
        setLastFetchedAt(Date.now());
        return rows;
      } catch (_) {
        setProducts([]);
        toast("Impossible de charger les produits");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [products, lastFetchedAt, scopeKey],
  );

  const fetchByMerchant = useCallback(
    async (merchantId, forceRefresh = false) => {
      if (!merchantId) return [];
      const nextScopeKey = `merchant:${merchantId}`;
      if (canUseCache(nextScopeKey, forceRefresh)) {
        return products;
      }

      setIsLoading(products.length === 0 || forceRefresh);
      try {
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_PRODUCTS,
          queries: [
            Query.equal("merchant_id", merchantId),
            Query.orderDesc("$createdAt"),
          ],
        });
        const rows = response.rows.map(normalizeProduct);
        setProducts(rows);
        setScopeKey(nextScopeKey);
        setLastFetchedAt(Date.now());
        return rows;
      } catch (_) {
        toast("Impossible de charger vos produits");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [products, lastFetchedAt, scopeKey],
  );

  async function createProduct({
    name,
    description,
    category,
    stockStatus,
    price,
    imageId,
    merchantId,
  }) {
    const cleanName = (name || "").trim();
    const cleanDescription = (description || "").trim();
    const cleanCategory = normalizeCategory(category);
    const cleanStockStatus = normalizeStockStatus(stockStatus);
    const cleanPrice = Number(price);

    if (!cleanName) {
      toast("Nom du produit requis");
      return null;
    }
    if (Number.isNaN(cleanPrice) || cleanPrice <= 0) {
      toast("Prix invalide");
      return null;
    }

    const baseData = {
      productName: cleanName,
      price: cleanPrice,
      image_id: (imageId || "").trim(),
      merchant_id: merchantId,
    };

    const payloadVariants = [
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        useUpperDescription: true,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        useUpperCategory: true,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        useUpperDescription: true,
        useUpperCategory: true,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        useLegacyStockKey: true,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        includeCategory: false,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        includeStockStatus: false,
      }),
      buildProductData(baseData, {
        description: cleanDescription,
        category: cleanCategory,
        stockStatus: cleanStockStatus,
        useUpperDescription: true,
        includeCategory: false,
      }),
    ];

    let row;
    let lastError;

    for (const payload of payloadVariants) {
      try {
        row = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_PRODUCTS,
          rowId: ID.unique(),
          data: payload,
        });
        break;
      } catch (error) {
        if (!isRetryableAttributeError(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    if (!row) {
      throw lastError;
    }

    const normalized = normalizeProduct(row);
    setProducts((prev) => [normalized, ...prev]);
    toast("Produit cree");
    return normalized;
  }

  async function updateProduct(rowId, data) {
    const payload = {};
    if (typeof data.name === "string") payload.productName = data.name.trim();
    const cleanDescription =
      typeof data.description === "string"
        ? data.description.trim()
        : undefined;
    if (typeof data.price !== "undefined") payload.price = Number(data.price);
    if (typeof data.imageId === "string")
      payload.image_id = data.imageId.trim();

    const cleanCategory =
      typeof data.category === "string"
        ? normalizeCategory(data.category)
        : undefined;
    const cleanStockStatus =
      typeof data.stockStatus === "string"
        ? normalizeStockStatus(data.stockStatus)
        : undefined;

    const payloadVariants =
      typeof cleanDescription === "string"
        ? [
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              useUpperDescription: true,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              useUpperCategory: true,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              useUpperDescription: true,
              useUpperCategory: true,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              useLegacyStockKey: true,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              includeCategory: false,
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              includeCategory: typeof cleanCategory === "string",
              includeStockStatus: false,
            }),
            buildProductData(payload, {
              description: cleanDescription,
              category: cleanCategory,
              stockStatus: cleanStockStatus,
              useUpperDescription: true,
              includeCategory: false,
              includeStockStatus: typeof cleanStockStatus === "string",
            }),
          ]
        : typeof cleanCategory === "string" ||
            typeof cleanStockStatus === "string"
          ? [
              (() => {
                let next = payload;
                if (typeof cleanCategory === "string") {
                  next = withCategory(next, cleanCategory, false);
                }
                if (typeof cleanStockStatus === "string") {
                  next = withStockStatus(next, cleanStockStatus, false);
                }
                return next;
              })(),
              (() => {
                let next = payload;
                if (typeof cleanCategory === "string") {
                  next = withCategory(next, cleanCategory, true);
                }
                if (typeof cleanStockStatus === "string") {
                  next = withStockStatus(next, cleanStockStatus, true);
                }
                return next;
              })(),
              payload,
            ]
          : [payload];

    let row;
    let lastError;

    for (const candidate of payloadVariants) {
      try {
        row = await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_PRODUCTS,
          rowId,
          data: candidate,
        });
        break;
      } catch (error) {
        if (!isRetryableAttributeError(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    if (!row) {
      throw lastError;
    }

    const normalized = normalizeProduct(row);
    setProducts((prev) =>
      prev.map((item) => (item.$id === rowId ? normalized : item)),
    );
    toast("Produit modifie");
    return normalized;
  }

  async function removeProduct(rowId) {
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_PRODUCTS,
      rowId,
    });
    setProducts((prev) => prev.filter((product) => product.$id !== rowId));
    toast("Produit supprime");
  }

  const value = useMemo(
    () => ({
      products,
      isLoading,
      fetchAll,
      fetchByMerchant,
      createProduct,
      updateProduct,
      removeProduct,
    }),
    [products, isLoading, fetchAll, fetchByMerchant],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}
