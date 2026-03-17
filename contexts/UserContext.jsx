import { createContext, useContext, useEffect, useState } from "react";
import { ID, Query } from "react-native-appwrite";
import { account, DATABASE_ID, TABLE_USERS, tablesDB } from "../lib/appwrite";
import { toast } from "../lib/toast";

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  async function createProfileFor(accountUser, role = "client", fullName = "") {
    const profilePayload = {
      email: accountUser.email,
      Name: fullName || accountUser.name || accountUser.email,
      role,
    };

    try {
      return await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_USERS,
        rowId: accountUser.$id,
        data: profilePayload,
      });
    } catch (_) {
      return await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_USERS,
        rowId: ID.unique(),
        data: profilePayload,
      });
    }
  }

  async function getProfileByEmail(email) {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      queries: [Query.equal("email", email)],
    });
    return response.rows[0] || null;
  }

  async function ensureProfile(accountUser, role = "client", fullName = "") {
    const existing = await getProfileByEmail(accountUser.email);
    if (existing) {
      setProfile(existing);
      return existing;
    }

    await createProfileFor(accountUser, role, fullName);

    const created = await getProfileByEmail(accountUser.email);
    if (!created) {
      throw new Error(
        "Compte cree mais profil non enregistre dans la table users. Verifie les permissions de creation Appwrite.",
      );
    }

    setProfile(created);
    return created;
  }

  async function loadProfile(
    accountUser,
    fallbackRole = "client",
    fallbackName = "",
  ) {
    return ensureProfile(accountUser, fallbackRole, fallbackName);
  }

  async function login(email, password) {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch (_) {
      // No active session, that's fine
    }
    await account.createEmailPasswordSession({ email, password });
    const current = await account.get();
    setUser(current);
    await loadProfile(current);
    toast("Bon retour !");
  }

  async function logout() {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch (_) {
      // If the session is already invalid, we still want to reset local state.
    } finally {
      setUser(null);
      setProfile(null);
      toast("Deconnexion reussie");
    }
  }

  async function register(email, password, role = "client", fullName = "") {
    await account.create({ userId: ID.unique(), email, password });
    await account.createEmailPasswordSession({ email, password });
    const current = await account.get();
    setUser(current);
    await ensureProfile(current, role, fullName);
    toast("Compte cree");
  }

  async function refreshProfile() {
    if (!user) return;
    await loadProfile(user);
  }

  useEffect(() => {
    account
      .get()
      .then(async (current) => {
        setUser(current);
        await loadProfile(current);
      })
      .catch(() => {
        setUser(null);
        setProfile(null);
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const role = (profile?.role || "").toLowerCase();
  const isMerchant = role === "merchant";
  const displayName = profile?.Name || profile?.name || user?.name || "";

  return (
    <UserContext.Provider
      value={{
        current: user,
        profile,
        role,
        isMerchant,
        displayName,
        isLoaded,
        login,
        logout,
        register,
        refreshProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
