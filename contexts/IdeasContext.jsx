import { createContext, useCallback, useContext, useState } from "react";
import { ID, Permission, Query, Role } from "react-native-appwrite";
import { DATABASE_ID, TABLE_ID, tablesDB } from "../lib/appwrite";
import { toast } from "../lib/toast";

const IdeasContext = createContext();

export function useIdeas() {
  return useContext(IdeasContext);
}

export function IdeasProvider({ children }) {
  const [ideas, setIdeas] = useState([]);

  const fetch = useCallback(async () => {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        queries: [Query.orderDesc("$createdAt")],
      });
      setIdeas(response.rows);
    } catch (_) {
      setIdeas([]);
    }
  }, []);

  async function add(idea) {
    const response = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ID.unique(),
      data: idea,
      permissions: [Permission.write(Role.user(idea.userId))],
    });
    setIdeas((prev) => [response, ...prev]);
    toast("Idee ajoutee");
  }

  async function remove(id) {
    await tablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: id,
    });
    setIdeas((prev) => prev.filter((idea) => idea.$id !== id));
    toast("Idee supprimee");
  }

  return (
    <IdeasContext.Provider value={{ current: ideas, add, remove, fetch }}>
      {children}
    </IdeasContext.Provider>
  );
}
