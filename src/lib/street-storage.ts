export const streetStorageKey = (userId?: string) =>
  "zapruda:street-session:v2:" + (userId || "guest");
