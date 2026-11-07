import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const stagingConfigured = Boolean(
  url === "https://yudtbifopfnjtjanaqrd.supabase.co" &&
    key &&
    key.startsWith("sb_publishable_") &&
    !key.includes("INSERT_"),
);

const store = {
  getItem: (item: string) => SecureStore.getItemAsync(item),
  setItem: (item: string, value: string) => SecureStore.setItemAsync(item, value),
  removeItem: (item: string) => SecureStore.deleteItemAsync(item),
};

// Deliberately STAGING-only; never fall back to the Production project.
export const supabase: SupabaseClient | null = stagingConfigured
  ? createClient(url!, key!, {
      auth: {
        storage: store,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
