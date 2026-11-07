/** Local-only appearance settings. Never stores passwords or account information. */
export type AppBackground = "classic" | "electric-blue";
export type ChatBackground = "plain" | "forest" | "slate" | "water";
export type AppWallpaper = "matte-black" | "carbon" | "neon-threads" | "topographic";
export const LIQUID_DROP_STYLES = [
  { value: "classic-glass", title: "Classic Glass" },
  { value: "soft-liquid", title: "Soft Liquid" },
  { value: "organic-drop", title: "Organic Drop" },
] as const;
export type LiquidDropStyle = (typeof LIQUID_DROP_STYLES)[number]["value"];
export type LiquidDropAppearance = { style: LiquidDropStyle; intensity: number; animate: boolean };
export const DEFAULT_LIQUID_DROP: LiquidDropAppearance = {
  style: "soft-liquid",
  intensity: 40,
  animate: true,
};

// Optional fields keep existing device preferences compatible.
export type Appearance = {
  background: AppBackground;
  chat: ChatBackground;
  wallpaper?: AppWallpaper;
  liquidDrop?: LiquidDropAppearance;
};

export const APPEARANCE_STORAGE_KEY = "zapruda.appearance.v1";
/** Runs before styles/paint. Only allowlisted appearance enums reach HTML attributes. */
export const APPEARANCE_BOOTSTRAP_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem("zapruda.appearance.v1")||"null")||{},d=document.documentElement,l=a.liquidDrop||{};d.dataset.zaprudaBackground=a.background==="electric-blue"?"electric-blue":"classic";d.dataset.zaprudaWallpaper=["matte-black","carbon","neon-threads","topographic"].includes(a.wallpaper)?a.wallpaper:"matte-black";d.dataset.zaprudaLiquid=["classic-glass","soft-liquid","organic-drop"].includes(l.style)?l.style:"soft-liquid";d.dataset.zaprudaLiquidMotion=l.animate===false?"off":"on";d.style.setProperty("--z-liquid-strength",typeof l.intensity==="number"&&Number.isFinite(l.intensity)?String(Math.round(Math.min(100,Math.max(0,l.intensity)))/100):"0.4");}catch(e){}})();`;
export const DEFAULT_APPEARANCE: Appearance = { background: "classic", chat: "plain" };

export const APP_BACKGROUNDS: ReadonlyArray<{
  value: AppBackground;
  title: string;
  description: string;
  preview: string;
  secondaryAccent?: string;
}> = [
  {
    value: "classic",
    title: "Matte Black",
    description: "Матовый чёрный · графит + Electric Lime (по умолчанию)",
    preview: "linear-gradient(140deg,#0B0D0E,#1A1D21)",
    secondaryAccent: "#1A1D21",
  },
  {
    value: "electric-blue",
    title: "Electric Blue",
    description: "Яркий синий · лайм + баклажановый",
    preview: "linear-gradient(145deg,#1760E8,#1239A6 65%,#091D57)",
    secondaryAccent: "#614051",
  },
];

export const CHAT_BACKGROUNDS: ReadonlyArray<{
  value: ChatBackground;
  title: string;
  description: string;
  preview: string;
}> = [
  {
    value: "plain",
    title: "Стандарт",
    description: "Ровный тёмный фон",
    preview: "linear-gradient(135deg,#151A14,#0C100D)",
  },
  {
    value: "forest",
    title: "Лесной",
    description: "Зелёный с мягкой глубиной",
    preview: "radial-gradient(circle at 25% 20%,#29472B,#101A12)",
  },
  {
    value: "slate",
    title: "Графит",
    description: "Сдержанный серый",
    preview: "linear-gradient(135deg,#272D31,#131719)",
  },
  {
    value: "water",
    title: "Водоём",
    description: "Сине-зелёные оттенки",
    preview: "radial-gradient(circle at 50% 10%,#234750,#0C191E)",
  },
];

/** Electric Blue never displays green chat previews, irrespective of saved chat style. */
export const ELECTRIC_BLUE_CHAT_PREVIEWS: Record<
  ChatBackground,
  { title: string; description: string; preview: string }
> = {
  plain: {
    title: "Синий",
    description: "Сдержанный насыщенный синий",
    preview: "linear-gradient(135deg,#152D72,#0B2058)",
  },
  forest: {
    title: "Баклажановый",
    description: "Глубокий баклажановый",
    preview: "radial-gradient(circle at 25% 20%,#614051,#16285D)",
  },
  slate: {
    title: "Глубокий синий",
    description: "Тёмно-синие оттенки",
    preview: "linear-gradient(135deg,#203A86,#0B2058)",
  },
  water: {
    title: "Электрик",
    description: "Яркий синий без зелёного",
    preview: "radial-gradient(circle at 40% 10%,#1458DB,#1239A6)",
  },
};

export const APP_WALLPAPERS: ReadonlyArray<{
  value: AppWallpaper;
  title: string;
  description: string;
}> = [
  { value: "matte-black", title: "Matte Black", description: "Чистый фон. Ничего лишнего." },
  { value: "carbon", title: "Carbon", description: "Матовое карбоновое переплетение." },
  {
    value: "neon-threads",
    title: "Neon Threads",
    description: "Тонкие нити, мягкий свет по краям.",
  },
  { value: "topographic", title: "Topographic", description: "Спокойные контуры воды и рельефа." },
];

const backgroundValues = APP_BACKGROUNDS.map((item) => item.value);
const chatValues = CHAT_BACKGROUNDS.map((item) => item.value);

function normalizeLiquidDrop(value: object): LiquidDropAppearance {
  const raw = value as Partial<Record<keyof LiquidDropAppearance, unknown>>;
  return {
    style:
      LIQUID_DROP_STYLES.find((item) => item.value === raw.style)?.value ??
      DEFAULT_LIQUID_DROP.style,
    intensity:
      typeof raw.intensity === "number" && Number.isFinite(raw.intensity)
        ? Math.round(Math.max(0, Math.min(100, raw.intensity)))
        : DEFAULT_LIQUID_DROP.intensity,
    animate: typeof raw.animate === "boolean" ? raw.animate : DEFAULT_LIQUID_DROP.animate,
  };
}

export function normalizeAppearance(value: unknown): Appearance {
  if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE };
  const raw = value as Partial<Record<keyof Appearance, unknown>>;
  return {
    background: backgroundValues.includes(raw.background as AppBackground)
      ? (raw.background as AppBackground)
      : DEFAULT_APPEARANCE.background,
    chat: chatValues.includes(raw.chat as ChatBackground)
      ? (raw.chat as ChatBackground)
      : DEFAULT_APPEARANCE.chat,
    ...(APP_WALLPAPERS.some((item) => item.value === raw.wallpaper)
      ? { wallpaper: raw.wallpaper as AppWallpaper }
      : {}),
    ...(raw.liquidDrop && typeof raw.liquidDrop === "object"
      ? { liquidDrop: normalizeLiquidDrop(raw.liquidDrop) }
      : {}),
  };
}

export function loadAppearance(): Appearance {
  if (typeof window === "undefined") return { ...DEFAULT_APPEARANCE };
  try {
    return normalizeAppearance(
      JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null"),
    );
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["zaprudaBackground"] = appearance.background;
  document.documentElement.dataset["zaprudaChat"] = appearance.chat;
  document.documentElement.dataset["zaprudaWallpaper"] = appearance.wallpaper ?? "matte-black";
  const liquid = appearance.liquidDrop ?? DEFAULT_LIQUID_DROP;
  document.documentElement.dataset["zaprudaLiquid"] = liquid.style;
  document.documentElement.dataset["zaprudaLiquidMotion"] = liquid.animate ? "on" : "off";
  document.documentElement.style.setProperty("--z-liquid-strength", String(liquid.intensity / 100));
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
