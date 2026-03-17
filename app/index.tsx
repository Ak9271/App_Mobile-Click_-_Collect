import { Redirect } from "expo-router";
import { useUser } from "../contexts/UserContext";

export default function HomeScreen() {
  const user = useUser();

  if (!user.isLoaded) return null;
  if (!user.current) return <Redirect href="/login" />;

  return (
    <Redirect href={user.isMerchant ? "/merchant-products" : "/products"} />
  );
}
