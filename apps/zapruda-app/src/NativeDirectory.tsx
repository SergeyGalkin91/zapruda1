import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "./supabase";
import { theme as t } from "./theme";

type Kind = "communities" | "trips" | "places";
type Item = { id: string; title: string; subtitle: string; info?: string };
const defs: Record<Kind, { title: string; empty: string }> = {
  communities: { title: "Сообщества", empty: "Доступных сообществ пока нет." },
  trips: { title: "Выезды", empty: "Открытых выездов пока нет." },
  places: { title: "Места общения", empty: "Пока нет доступных комнат." },
};

export function NativeDirectory({ kind }: { kind: Kind }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Item | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; body: string; created_at: string }>>([]);
  const [chatError, setChatError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("STAGING не подключён. Нужен публичный ключ проекта."); return; }
    setBusy(true); setError("");
    if (kind === "communities") {
      const { data, error: e } = await supabase.from("social_groups")
        .select("id,name,description,city").order("name").limit(100);
      if (e) setError(e.message);
      else setItems((data ?? []).map(x => ({
        id: String(x.id), title: String(x.name), subtitle: String(x.city ?? "Город не указан"),
        info: String(x.description ?? ""),
      })));
    } else if (kind === "trips") {
      const { data, error: e } = await supabase.from("partner_trips")
        .select("id,city,destination,departure_at,status").eq("status", "open")
        .order("departure_at", { ascending: true }).limit(100);
      if (e) setError(e.message);
      else setItems((data ?? []).map(x => ({
        id: String(x.id), title: String(x.destination ?? "Рыболовный выезд"),
        subtitle: String(x.city ?? "Город не указан"),
        info: x.departure_at ? new Date(String(x.departure_at)).toLocaleString("ru-RU") : "",
      })));
    } else {
      const { data, error: e } = await supabase.from("chat_places")
        .select("id,name,level").order("name").limit(100);
      if (e) setError(e.message);
      else setItems((data ?? []).map(x => ({
        id: String(x.id), title: String(x.name), subtitle: String(x.level ?? "Локация"),
      })));
    }
    setBusy(false);
  }, [kind]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selectedPlace || !supabase) { setMessages([]); return; }
    let active = true;
    setChatError("");
    void supabase.from("chat_messages")
      .select("id,body,created_at").eq("place_id", selectedPlace.id)
      .eq("topic", "general").order("created_at", { ascending: false }).limit(50)
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) setChatError(e.message);
        else setMessages((data ?? []).map(x => ({
          id: String(x.id), body: String(x.body), created_at: String(x.created_at),
        })).reverse());
      });
    return () => { active = false; };
  }, [selectedPlace]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {selectedPlace ? <>
        <Pressable accessibilityRole="button" onPress={() => setSelectedPlace(null)}
          style={styles.button}><Text style={styles.action}>← Все места общения</Text></Pressable>
        <Text style={styles.heading}>{selectedPlace.title}</Text>
        <Text style={styles.description}>Общий чат · только сообщения, доступные по правилам STAGING RLS.</Text>
        {chatError ? <Text style={styles.error}>{chatError}</Text> : null}
        {!messages.length && !chatError ? <Text style={styles.description}>Нет доступных сообщений.</Text> : null}
        {messages.map(m => <View key={m.id} style={styles.card}>
          <Text style={styles.name}>{m.body}</Text>
          <Text style={styles.description}>{new Date(m.created_at).toLocaleString("ru-RU")}</Text>
        </View>)}
        <Text style={styles.description}>Отправку сообщений подключим после отдельной проверки прав и контрактов чата.</Text>
      </> : <>
        <Text style={styles.heading}>{defs[kind].title}</Text>
        <Text style={styles.description}>Реальные данные Supabase STAGING. Никаких демонстрационных клубов или выездов.</Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}>
          <Text style={styles.action}>Обновить ↻</Text>
        </Pressable>
        {busy ? <ActivityIndicator color={t.lime} /> : null}
        {error ? <Text style={styles.error}>Не удалось загрузить: {error}</Text> : null}
        {!busy && !error && !items.length ? <Text style={styles.description}>{defs[kind].empty}</Text> : null}
        {items.map(item => <Pressable key={item.id}
          accessibilityRole={kind === "places" ? "button" : "text"}
          onPress={kind === "places" ? () => setSelectedPlace(item) : undefined}
          style={styles.card}>
          <Text style={styles.name}>{item.title}</Text>
          <Text style={styles.description}>{item.subtitle}</Text>
          {item.info ? <Text style={styles.description}>{item.info}</Text> : null}
        </Pressable>)}
      </>}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 34, gap: 11 },
  heading: { color: t.white, fontWeight: "800", fontSize: 24 },
  description: { color: t.muted, fontSize: 13, lineHeight: 20 },
  error: { color: "#FFA9A4", fontSize: 13 },
  card: { borderRadius: 20, backgroundColor: t.surface, padding: 17, borderColor: t.border, borderWidth: 1, gap: 8 },
  name: { color: t.white, fontSize: 16, fontWeight: "700" },
  button: { borderRadius: 16, borderColor: t.border, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, alignSelf: "flex-start" },
  action: { color: t.lime, fontWeight: "700" },
});
