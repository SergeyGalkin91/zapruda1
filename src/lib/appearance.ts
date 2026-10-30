/** Local-only appearance settings. Never stores passwords or account information. */
export type AppBackground = "classic" | "forest" | "graphite" | "night";
export type ChatBackground = "plain" | "forest" | "slate" | "water";
export type Appearance = { background: AppBackground; chat: ChatBackground };

export const APPEARANCE_STORAGE_KEY = "zapruda.appearance.v1";
export const DEFAULT_APPEARANCE: Appearance = { background: "classic", chat: "plain" };

export const APP_BACKGROUNDS: ReadonlyArray<{
  value: AppBackground; title: string; description: string; preview: string;
}> = [
  { value: "classic", title: "Классика", description: "Чёрный с фирменным лаймом", preview: "linear-gradient(140deg,#090B09,#1A2115)" },
  { value: "forest", title: "Лес", description: "Тёмные зелёные оттенки", preview: "linear-gradient(140deg,#10251A,#07100D)" },
  { value: "graphite", title: "Графит", description: "Спокойный тёмно-серый", preview: "linear-gradient(140deg,#292D31,#101215)" },
  { value: "night", title: "Ночная вода", description: "Глубокий сине-зелёный", preview: "linear-gradient(140deg,#132C32,#071216)" },
];

export const CHAT_BACKGROUNDS: ReadonlyArray<{
  value: ChatBackground; title: string; description: string; preview: string;
}> = [
  { value: "plain", title: "Стандарт", description: "Ровный тёмный фон", preview: "linear-gradient(135deg,#151A14,#0C100D)" },
  { value: "forest", title: "Лесной", description: "Зелёный с мягкой глубиной", preview: "radial-gradient(circle at 25% 20%,#29472B,#101A12)" },
  { value: "slate", title: "Графит", description: "Сдержанный серый", preview: "linear-gradient(135deg,#272D31,#131719)" },
  { value: "water", title: "Водоём", description: "Сине-зелёные оттенки", preview: "radial-gradient(circle at 50% 10%,#234750,#0C191E)" },
];

const backgroundValues = APP_BACKGROUNDS.map(item => item.value);
const chatValues = CHAT_BACKGROUNDS.map(item => item.value);

export function normalizeAppearance(value: unknown): Appearance {
  if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE };
  const raw = value as Partial<Record<keyof Appearance, unknown>>;
  return {
    background: backgroundValues.includes(raw.background as AppBackground)
      ? raw.background as AppBackground : DEFAULT_APPEARANCE.background,
    chat: chatValues.includes(raw.chat as ChatBackground)
      ? raw.chat as ChatBackground : DEFAULT_APPEARANCE.chat,
  };
}

export function loadAppearance(): Appearance {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    return normalizeAppearance(JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null"));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.zaprudaBackground = appearance.background;
  document.documentElement.dataset.zaprudaChat = appearance.chat;
}

export function saveAppearance(appearance: Appearance): boolean {
  applyAppearance(appearance);
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    return true;
  } catch {
    // Storage can be blocked in private windows; appearance still applies until reload.
    return false;
  }
}
