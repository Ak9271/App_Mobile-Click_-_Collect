import { Account, Client, Storage, TablesDB } from "react-native-appwrite";

export const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "69aed0ac00007c4d205a";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform("com.clement.ideatracker");

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);

export const DATABASE_ID = "69b8061300042a115cfd";
export const TABLE_USERS = "users";
export const TABLE_PRODUCTS = "products";
export const TABLE_ORDERS = "orders";
export const BUCKET_PRODUCT_IMAGES = "69b95ae900328e7f761a";

export function getStorageFileViewUrl(bucketId, fileId, token) {
  if (!bucketId || !fileId) return "";
  try {
    return storage.getFileViewURL(bucketId, fileId, token).toString();
  } catch (_) {
    const tokenPart = token ? `&token=${encodeURIComponent(token)}` : "";
    return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}${tokenPart}`;
  }
}
