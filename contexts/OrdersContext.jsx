import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import { ID, Query } from "react-native-appwrite";
import { DATABASE_ID, TABLE_ORDERS, tablesDB } from "../lib/appwrite";
import { toast } from "../lib/toast";

const OrdersContext = createContext();
const CACHE_TTL_MS = 30_000;

const STATUS_LABELS = {
  pending: "En attente",
  ready: "Prete",
  done: "Recuperee",
};

function normalizeOrder(row) {
  const status = row.status || "pending";
  return {
    ...row,
    status,
    statusLabel: STATUS_LABELS[status] || status,
  };
}

export function useOrders() {
  return useContext(OrdersContext);
}

function groupByMerchant(items) {
  return items.reduce((acc, item) => {
    const merchantId = item.merchant_id || item.merchantId;
    if (!merchantId) return acc;
    if (!acc[merchantId]) acc[merchantId] = [];
    acc[merchantId].push(item);
    return acc;
  }, {});
}

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(0);
  const [scopeKey, setScopeKey] = useState("");

  function canUseCache(nextScopeKey, forceRefresh = false) {
    if (forceRefresh) return false;
    if (!orders.length) return false;
    if (scopeKey !== nextScopeKey) return false;
    return Date.now() - lastFetchedAt < CACHE_TTL_MS;
  }

  const fetchClientOrders = useCallback(
    async (clientId, forceRefresh = false) => {
      if (!clientId) return;
      const nextScopeKey = `client:${clientId}`;
      if (canUseCache(nextScopeKey, forceRefresh)) {
        return orders;
      }

      setIsLoading(orders.length === 0 || forceRefresh);
      try {
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_ORDERS,
          queries: [
            Query.equal("client_id", clientId),
            Query.orderDesc("$createdAt"),
          ],
        });
        const rows = response.rows.map(normalizeOrder);
        setOrders(rows);
        setScopeKey(nextScopeKey);
        setLastFetchedAt(Date.now());
        return rows;
      } catch (_) {
        setOrders([]);
        toast("Impossible de charger vos commandes");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [orders, lastFetchedAt, scopeKey],
  );

  const fetchMerchantOrders = useCallback(
    async (merchantId, status, forceRefresh = false) => {
      if (!merchantId) return;
      const nextScopeKey = `merchant:${merchantId}:status:${status || "all"}`;
      if (canUseCache(nextScopeKey, forceRefresh)) {
        return orders;
      }

      setIsLoading(orders.length === 0 || forceRefresh);
      try {
        const queries = [
          Query.equal("merchant_id", merchantId),
          Query.orderDesc("$createdAt"),
        ];
        if (status) queries.unshift(Query.equal("status", status));

        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_ORDERS,
          queries,
        });
        const rows = response.rows.map(normalizeOrder);
        setOrders(rows);
        setScopeKey(nextScopeKey);
        setLastFetchedAt(Date.now());
        return rows;
      } catch (_) {
        setOrders([]);
        toast("Impossible de charger les commandes");
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [orders, lastFetchedAt, scopeKey],
  );

  async function createOrdersFromCart({ clientId, items }) {
    if (!clientId || !items?.length) {
      toast("Panier vide");
      return [];
    }

    const byMerchant = groupByMerchant(items);
    const merchantIds = Object.keys(byMerchant);

    if (!merchantIds.length) {
      toast("Aucun commercant associe aux produits");
      return [];
    }

    const createdOrders = [];
    for (const merchantId of merchantIds) {
      const row = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ORDERS,
        rowId: ID.unique(),
        data: {
          client_id: clientId,
          merchant_id: merchantId,
          status: "pending",
        },
      });
      createdOrders.push(normalizeOrder(row));
    }

    setOrders((prev) => [...createdOrders, ...prev]);
    toast(`Commande envoyee (${createdOrders.length})`);
    return createdOrders;
  }

  async function updateOrderStatus(orderId, nextStatus) {
    const row = await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ORDERS,
      rowId: orderId,
      data: { status: nextStatus },
    });

    const normalized = normalizeOrder(row);
    setOrders((prev) =>
      prev.map((order) => (order.$id === orderId ? normalized : order)),
    );
    toast("Statut de commande mis a jour");
    return normalized;
  }

  const value = useMemo(
    () => ({
      orders,
      isLoading,
      fetchClientOrders,
      fetchMerchantOrders,
      createOrdersFromCart,
      updateOrderStatus,
    }),
    [orders, isLoading, fetchClientOrders, fetchMerchantOrders],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}
