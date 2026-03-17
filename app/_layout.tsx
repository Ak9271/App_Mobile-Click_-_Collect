import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable } from "react-native";
import { CartProvider } from "../contexts/CartContext";
import { OrdersProvider } from "../contexts/OrdersContext";
import { ProductsProvider } from "../contexts/ProductsContext";
import { UserProvider } from "../contexts/UserContext";

export default function RootLayout() {
  const router = useRouter();

  return (
    <UserProvider>
      <ProductsProvider>
        <OrdersProvider>
          <CartProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#050805" },
                headerTintColor: "#ffffff",
                headerTitleStyle: { fontWeight: "700" },
                contentStyle: { backgroundColor: "#050805" },
                headerLeft: ({ canGoBack, tintColor }) =>
                  canGoBack ? (
                    <Pressable
                      onPress={() => router.back()}
                      hitSlop={10}
                      style={{ paddingRight: 6 }}
                    >
                      <Feather
                        name="arrow-left"
                        size={22}
                        color={tintColor ?? "#ffffff"}
                      />
                    </Pressable>
                  ) : null,
              }}
            >
              <Stack.Screen
                name="index"
                options={{ title: "TP - Commandes" }}
              />
              <Stack.Screen name="products" options={{ title: "Catalogue" }} />
              <Stack.Screen
                name="product-details"
                options={{ title: "Detail produit" }}
              />
              <Stack.Screen name="cart" options={{ title: "Panier" }} />
              <Stack.Screen
                name="order-confirmation"
                options={{ title: "Confirmation" }}
              />
              <Stack.Screen
                name="client-orders"
                options={{ title: "Mes commandes" }}
              />
              <Stack.Screen
                name="merchant-orders"
                options={{ title: "Commandes commercant" }}
              />
              <Stack.Screen
                name="merchant-products"
                options={{ title: "Mes produits" }}
              />
              <Stack.Screen
                name="merchant-dashboard"
                options={{ title: "Tableau de bord" }}
              />
              <Stack.Screen name="profile" options={{ title: "Compte" }} />
              <Stack.Screen
                name="login"
                options={{ title: "Connexion", headerShown: false }}
              />
            </Stack>
          </CartProvider>
        </OrdersProvider>
      </ProductsProvider>
    </UserProvider>
  );
}
