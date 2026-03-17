import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type TabItem = {
  key: "catalogue" | "dashboard" | "add" | "orders";
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  route?: string;
};

const tabs: TabItem[] = [
  {
    key: "catalogue",
    label: "Catalogue",
    icon: "shopping-bag",
    route: "/merchant-products",
  },
  {
    key: "dashboard",
    label: "Tableau de bord",
    icon: "bar-chart-2",
    route: "/merchant-dashboard",
  },
  { key: "add", label: "Ajouter", icon: "plus-circle" },
  {
    key: "orders",
    label: "Commandes",
    icon: "list",
    route: "/merchant-orders",
  },
];

export function MerchantBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handlePress(item: TabItem) {
    if (item.key === "add") {
      router.push("/merchant-products?open=create");
      return;
    }

    if (!item.route) return;
    if (pathname === item.route) return;
    router.push(item.route as never);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {tabs.map((item) => {
          const active = item.route ? pathname === item.route : false;

          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
              onPress={() => handlePress(item)}
            >
              <Feather
                name={item.icon}
                size={20}
                color={active ? "#b026ff" : "#ffffff"}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#050805",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 66,
    gap: 5,
  },
  label: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: "#b026ff",
  },
  pressed: {
    opacity: 0.8,
  },
});
