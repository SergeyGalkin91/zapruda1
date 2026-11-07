import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from "react-native";
import { supabase, stagingConfigured } from "./src/supabase";
import { theme as t } from "./src/theme";
import { NativeDirectory } from "./src/NativeDirectory";

type Tab = "Лента" | "Комьюнити" | "Создать" | "Выезды" | "Чат";
type FeedReport = {
  id: string; title: string; body: string | null;
  location_name: string | null; created_at: string;
};
const tabs: Tab[] = ["Лента", "Комьюнити", "Создать", "Выезды", "Чат"];
const glyphs = ["⌂", "◎", "+", "↗", "◌"];
const disciplines = ["Спиннинг", "Фидер", "Поплавок", "Нахлыст", "Зимняя", "Другое"];
const reportQuestions = ["Где рыбачил?", "Название отчёта", "Вид рыбалки", "Описание (необязательно)", "Проверить отчёт"];

function Button({ title, onPress, ghost, disabled }: {
  title: string; onPress: () => void; ghost?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.button, ghost && s.ghost, disabled && { opacity: .45 }, pressed && { opacity: .75 }]}>
      <Text style={[s.buttonText, ghost && { color: t.white }]}>{title}</Text>
    </Pressable>
  );
}
function Wordmark() {
  return <View><Text style={s.brand}>ZAPRUDA</Text><Text style={s.brandSub}>C O M M U N I T Y</Text></View>;
}
function Frame({ children, title, onProfile }: {
  children: React.ReactNode; title: string; onProfile: () => void;
}) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}><Wordmark />
        <Pressable onPress={onProfile} accessibilityRole="button" accessibilityLabel="Профиль"
          style={s.profileButton}><Text style={{ color: t.lime, fontSize: 21 }}>♙</Text></Pressable>
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </SafeAreaView>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return <View style={s.card}><Text style={s.emptyTitle}>{title}</Text><Text style={s.body}>{text}</Text></View>;
}
function Feed({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<FeedReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!supabase) return;
    setBusy(true); setError("");
    const result = await supabase.from("fishing_reports")
      .select("id,title,body,location_name,created_at")
      .eq("is_public", true).order("created_at", { ascending: false }).limit(20);
    if (result.error) setError("Лента недоступна: " + result.error.message);
    else setItems((result.data ?? []) as FeedReport[]);
    setBusy(false);
  }, []);
  useEffect(() => { void reload(); }, [reload, refreshKey]);
  return (
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.hero}>На своей волне<Text style={{ color: t.lime }}>.</Text></Text>
      <Text style={s.body}>Истории с воды. Люди, с которыми хочется ловить.</Text>
      {!stagingConfigured && <Empty title="Подключение STAGING" text="Добавь публичный STAGING-ключ в локальную конфигурацию сборки. Production не подключается." />}
      {busy && <ActivityIndicator color={t.lime} style={{ marginTop: 20 }} />}
      {error ? <Empty title="Не удалось загрузить" text={error} /> : null}
      {!busy && !items.length && !error && stagingConfigured &&
        <Empty title="Пока тихо, как на бесклёвье" text="Публичных отчётов пока нет. Стань первым — опубликуй историю о рыбалке." />}
      {items.map(report => <View key={report.id} style={s.card}>
        <Text style={s.cardTitle}>{report.title}</Text>
        {report.location_name ? <Text style={s.accent}>⌖ {report.location_name}</Text> : null}
        {report.body ? <Text style={s.body}>{report.body}</Text> : null}
        <Text style={s.small}>{new Date(report.created_at).toLocaleDateString("ru-RU")}</Text>
      </View>)}
      <Button title={busy ? "Загрузка…" : "Обновить ленту"} ghost disabled={busy} onPress={() => void reload()} />
    </ScrollView>
  );
}
function Auth({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!supabase) return Alert.alert("STAGING", "Не настроен публичный ключ Supabase STAGING.");
    if (!email.trim() || password.length < 6) return Alert.alert("Проверь данные", "Укажи email и пароль от 6 символов.");
    setBusy(true);
    const res = register ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (res.error) return Alert.alert("Ошибка входа", res.error.message);
    if (register && !res.data.session) return Alert.alert("Проверь почту", "Подтверди адрес электронной почты, затем войди.");
    onDone();
  };
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.safe}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Wordmark /><Text style={s.hero}>{register ? "Регистрация" : "Войти в ZAPRUDA"}</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={t.muted}
        autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="Email" />
      <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Пароль" placeholderTextColor={t.muted}
        secureTextEntry autoComplete={register ? "new-password" : "current-password"} accessibilityLabel="Пароль" />
      <Button title={busy ? "Проверяем…" : register ? "Зарегистрироваться" : "Войти"} disabled={busy} onPress={() => void submit()} />
      <Button title={register ? "Уже есть аккаунт" : "Создать аккаунт"} ghost onPress={() => setRegister(x => !x)} />
      <Button title="Назад" ghost onPress={onCancel} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
function ReportWizard({ signedIn, onAuth, onPublished }: {
  signedIn: boolean; onAuth: () => void; onPublished: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (v: string) => setAnswers(old => old.map((x, i) => i === step ? v : x));
  const next = () => {
    if (step < 3 && !answers[step].trim()) {
      setError("Заполни обязательный пункт."); return;
    }
    setError(""); setStep(x => Math.min(4, x + 1));
  };
  const publish = async () => {
    if (!supabase) return Alert.alert("STAGING", "Настрой публичный ключ Supabase STAGING.");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user || auth.user.is_anonymous || !auth.user.email_confirmed_at)
      return Alert.alert("Нужен подтверждённый аккаунт", "Войди и подтверди email перед публикацией.");
    if (!answers[0].trim() || !answers[1].trim() || !answers[2].trim())
      return Alert.alert("Заполни обязательные пункты");
    setBusy(true);
    // A no-catch report follows the existing fishing_reports path.
    // Catch submissions require the separate publish_report_with_catches RPC and are NOT fabricated here.
    const { error: insertError } = await supabase.from("fishing_reports").insert({
      title: answers[1].trim(),
      body: answers[3].trim() || null,
      location_name: answers[0].trim(),
      fishing_method: answers[2],
      is_public: true,
      user_id: auth.user.id,
    });
    setBusy(false);
    if (insertError) return Alert.alert("Не удалось опубликовать", insertError.message);
    setAnswers(["", "", "", "", ""]); setStep(0);
    Alert.alert("Отчёт опубликован", "Он появится в публичной Ленте после обновления.");
    onPublished();
  };
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
    <View style={s.wizard}><Text style={s.accent}>НОВЫЙ ОТЧЁТ · {step + 1} / 5</Text>
      <View style={s.progressTrack}><View style={[s.progressFill, { width: `${(step + 1) * 20}%` }]} /></View>
      <Text style={s.heroSmall}>{reportQuestions[step]}</Text>
      {step === 2 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {disciplines.map(d => <Pressable key={d} onPress={() => update(d)}
          style={[s.chip, answers[2] === d && s.selectedChip]}>
          <Text style={{ color: answers[2] === d ? "#080D11" : t.white }}>{d}</Text>
        </Pressable>)}
      </ScrollView> : step === 4 ?
        <View style={s.card}>{answers.slice(0, 4).map((v, i) =>
          <Pressable key={i} onPress={() => setStep(i)} style={{ paddingVertical: 8 }}>
            <Text style={s.small}>{reportQuestions[i]} · изменить</Text>
            <Text style={s.body}>{v || "Пропущено"}</Text>
          </Pressable>)}</View>
        : <TextInput key={step} style={[s.input, step === 3 && { height: 100, borderRadius: 20, textAlignVertical: "top" }]}
          accessibilityLabel={reportQuestions[step]} value={answers[step]} onChangeText={update}
          multiline={step === 3} placeholder={step === 0 ? "Например, Ока" : step === 1 ? "Мой выезд на рыбалку" : "Как всё прошло?"}
          placeholderTextColor={t.muted} />}
      {error ? <Text style={{ color: "#FF938F", marginTop: 8 }}>{error}</Text> : null}
    </View>
    <View style={s.actions}>
      {!signedIn ? <Button title="Войти для публикации" onPress={onAuth} /> : null}
      {step > 0 ? <Button title="← Назад" ghost onPress={() => setStep(i => i - 1)} /> : null}
      {step === 3 ? <Button title="Пропустить" ghost onPress={next} /> : null}
      <Button title={busy ? "Публикуем…" : step === 4 ? "Опубликовать" : "Далее →"}
        disabled={busy} onPress={() => step === 4 ? void publish() : next()} />
    </View>
  </KeyboardAvoidingView>;
}
export default function App() {
  const [tab, setTab] = useState<Tab>("Лента");
  const [screen, setScreen] = useState<"main" | "auth" | "profile">("main");
  const [signedIn, setSignedIn] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);
  if (screen === "auth") return <Auth onCancel={() => setScreen("main")} onDone={() => setScreen("main")} />;
  if (screen === "profile") return <SafeAreaView style={s.safe}><View style={s.content}>
    <Wordmark /><Text style={s.hero}>Мой профиль</Text>
    <Text style={s.body}>{signedIn ? "Аккаунт подключён к STAGING." : "Войди, чтобы увидеть свои данные и отчёты."}</Text>
    <Button title={signedIn ? "Выйти из аккаунта" : "Войти / зарегистрироваться"} onPress={() => {
      if (!signedIn) return setScreen("auth");
      Alert.alert("Выйти?", "Завершить сеанс на этом устройстве?", [
        { text: "Отмена", style: "cancel" },
        { text: "Выйти", onPress: () => void supabase?.auth.signOut() },
      ]);
    }} />
    <Button title="Вернуться в приложение" ghost onPress={() => setScreen("main")} />
  </View></SafeAreaView>;
  return <Frame title={tab === "Лента" ? "" : tab} onProfile={() => setScreen("profile")}>
    <View style={{ flex: 1 }}>
      {tab === "Лента" ? <Feed refreshKey={refreshKey} /> :
        tab === "Создать" ? <ReportWizard signedIn={signedIn} onAuth={() => setScreen("auth")}
          onPublished={() => { setRefreshKey(k => k + 1); setTab("Лента"); }} /> :
        <NativeDirectory kind={tab === "Комьюнити" ? "communities" : tab === "Выезды" ? "trips" : "places"} />}
    </View>
    <View style={s.tabbar}>{tabs.map((item, index) =>
      <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }}
        onPress={() => setTab(item)} style={[s.tab, tab === item && s.activeTab]}>
        <Text style={[s.tabGlyph, tab === item && { color: "#0B1014" }]}>{glyphs[index]}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[s.tabLabel, tab === item && { color: "#0B1014" }]}>{item}</Text>
      </Pressable>)}</View>
  </Frame>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  brand: { color: t.white, fontSize: 23, fontWeight: "900", letterSpacing: 2 },
  brandSub: { color: t.lime, fontSize: 10, fontWeight: "700", letterSpacing: 2.2 },
  profileButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.surface, justifyContent: "center", alignItems: "center", borderColor: t.border, borderWidth: 1 },
  sectionTitle: { color: t.white, fontSize: 23, fontWeight: "800", marginHorizontal: 18, marginVertical: 4 },
  content: { paddingHorizontal: 18, paddingBottom: 30, gap: 12 },
  hero: { color: t.white, fontSize: 30, fontWeight: "800", marginTop: 10 },
  heroSmall: { color: t.white, fontSize: 22, fontWeight: "800", marginTop: 30, marginBottom: 14 },
  card: { borderRadius: 20, padding: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, gap: 9, marginTop: 9 },
  cardTitle: { color: t.white, fontSize: 18, fontWeight: "800" },
  emptyTitle: { color: t.white, fontSize: 17, fontWeight: "700" },
  body: { color: t.muted, fontSize: 14, lineHeight: 22 },
  small: { color: t.muted, fontSize: 11 },
  accent: { color: t.lime, fontSize: 12, fontWeight: "700" },
  input: { backgroundColor: t.elevated, borderWidth: 1, borderColor: "#7E9B47", borderRadius: 28, minHeight: 57, paddingVertical: 13, paddingHorizontal: 18, color: t.white, fontSize: 16, marginTop: 11 },
  button: { minHeight: 50, borderRadius: 25, backgroundColor: t.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 9 },
  ghost: { backgroundColor: t.elevated, borderWidth: 1, borderColor: t.border },
  buttonText: { color: "#0B1014", fontWeight: "800", fontSize: 14 },
  wizard: { flex: 1, paddingHorizontal: 18, paddingTop: 18 },
  progressTrack: { height: 4, borderRadius: 6, backgroundColor: t.border, overflow: "hidden", marginTop: 12 },
  progressFill: { height: 4, backgroundColor: t.lime },
  actions: { paddingHorizontal: 18, paddingBottom: 12 },
  chip: { paddingVertical: 13, paddingHorizontal: 15, marginRight: 8, borderRadius: 25, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  selectedChip: { backgroundColor: t.lime, borderColor: t.lime },
  tabbar: { flexDirection: "row", backgroundColor: "#10171C", borderTopWidth: 1, borderTopColor: t.border, paddingTop: 5, paddingBottom: Platform.OS === "ios" ? 5 : 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 15, minHeight: 52, paddingHorizontal: 1 },
  activeTab: { backgroundColor: t.lime },
  tabGlyph: { color: t.muted, fontSize: 18, fontWeight: "800" },
  tabLabel: { color: t.muted, fontSize: 9, fontWeight: "700" },
});
