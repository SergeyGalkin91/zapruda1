export const FISHING_DISCIPLINES = [
  { code: "Спиннинг", title: "Спиннинг", icon: "🎣", detail: "Джиг, твичинг, воблеры, блёсны" },
  { code: "Фидер", title: "Фидер", icon: "🧭", detail: "Донные оснастки и прикормка" },
  { code: "Поплавок", title: "Поплавок", icon: "〰️", detail: "Точная подача и тонкая настройка" },
  { code: "Нахлыст", title: "Нахлыст", icon: "🪶", detail: "Мушки и техника заброса" },
  { code: "Зимняя рыбалка", title: "Зимняя рыбалка", icon: "❄️", detail: "Лёд, мормышки и блёсны" },
  { code: "Карпфишинг", title: "Карпфишинг", icon: "🏕️", detail: "Карп, монтажи и длительные сессии" },
  { code: "Донная ловля", title: "Донная ловля", icon: "⚓", detail: "Донные снасти и течения" },
  { code: "Подводная охота", title: "Подводная охота", icon: "🌊", detail: "Наблюдение, напарники и безопасность" },
  { code: "Троллинг", title: "Троллинг", icon: "🚤", detail: "Ловля с движущейся лодки" },
  { code: "Морская рыбалка", title: "Морская рыбалка", icon: "🌊", detail: "Ловля в морской акватории" },
  { code: "Матчевая ловля", title: "Матчевая ловля", icon: "🎯", detail: "Дальний заброс с поплавочной снастью" },
  { code: "Болонская ловля", title: "Болонская ловля", icon: "🪝", detail: "Поплавочная ловля на течении" },
  { code: "Тенкара", title: "Тенкара", icon: "🏞️", detail: "Ловля искусственной мушкой без катушки" },
  { code: "Жерлицы", title: "Жерлицы", icon: "🧊", detail: "Зимняя ловля на живца" },
  { code: "Другое", title: "Другие техники", icon: "🐟", detail: "Нестандартные подходы к ловле" },
] as const;

export type FishingDisciplineName = (typeof FISHING_DISCIPLINES)[number]["code"];

export type FishingSpecialization = {
  fishing_method: string;
  report_count: number;
  credited_reports: number;
  catches_count: number;
  credited_catches: number;
  photo_reports: number;
  credited_photo_reports: number;
  distinct_waters: number;
  active_days: number;
  distinct_species: number;
  heaviest_catch_kg: number | null;
};

export const EMPTY_METHOD: FishingSpecialization = {
  fishing_method: "", report_count: 0, credited_reports: 0,
  catches_count: 0, credited_catches: 0, photo_reports: 0, credited_photo_reports: 0,
  distinct_waters: 0, active_days: 0, distinct_species: 0, heaviest_catch_kg: null,
};

export const XP_REWARDS = {
  report: 30, photo: 15, catch: 10, water: 10, day: 5,
} as const;

export const METHOD_RANKS = [
  { minXp: 0, name: "Новичок" },
  { minXp: 100, name: "Практик" },
  { minXp: 300, name: "Уверенный рыболов" },
  { minXp: 750, name: "Опытный" },
  { minXp: 1600, name: "Мастер техники" },
  { minXp: 3200, name: "Легенда направления" },
] as const;

export function methodExperience(stats: FishingSpecialization): number {
  return Math.max(0, stats.credited_reports) * XP_REWARDS.report
    + Math.max(0, stats.credited_photo_reports) * XP_REWARDS.photo
    + Math.max(0, stats.credited_catches) * XP_REWARDS.catch
    + Math.max(0, stats.distinct_waters) * XP_REWARDS.water
    + Math.max(0, stats.active_days) * XP_REWARDS.day;
}

export function methodExperienceBreakdown(stats: FishingSpecialization) {
  return [
    { label: "Зачётные отчёты", value: stats.credited_reports, per: XP_REWARDS.report, detail: "Первые два отчёта по этому направлению за сутки (UTC)" },
    { label: "Фотоотчёты", value: stats.credited_photo_reports, per: XP_REWARDS.photo, detail: "Зачётный отчёт хотя бы с одним прикреплённым фото" },
    { label: "Уловы", value: stats.credited_catches, per: XP_REWARDS.catch, detail: "До трёх рыб на зачётный фотоотчёт; это не подтверждённые трофеи" },
    { label: "Разные водоёмы", value: stats.distinct_waters, per: XP_REWARDS.water, detail: "Разные названия водоёмов в зачётных фотоотчётах; названия вводятся автором" },
    { label: "Дни активности", value: stats.active_days, per: XP_REWARDS.day, detail: "Разные календарные дни с зачётным отчётом" },
  ];
}

export function methodLevel(xp: number) {
  const index = Math.max(0, METHOD_RANKS.findLastIndex(rank => xp >= rank.minXp));
  const current = METHOD_RANKS[index];
  const next = METHOD_RANKS[index + 1] ?? null;
  const percent = next
    ? Math.max(0, Math.min(100, 100 * (xp - current.minXp) / (next.minXp - current.minXp)))
    : 100;
  return { index, current, next, percent };
}

export type MethodAchievement = {
  id: string; name: string; category: "Старт" | "Практика" | "Трофеи" | "Исследование";
  description: string; instructions: string; current: number; target: number;
};

const methodFlavors: Record<string, { starter: string; hero: string }> = {
  "Спиннинг": { starter: "Первый заброс", hero: "Охотник за хищником" },
  "Фидер": { starter: "Первая кормушка", hero: "Точный закорм" },
  "Поплавок": { starter: "Первая поклёвка", hero: "Чуткий поплавок" },
  "Нахлыст": { starter: "Первый взмах", hero: "Мастер мушки" },
  "Зимняя рыбалка": { starter: "Первая лунка", hero: "Ледовый практик" },
  "Карпфишинг": { starter: "Первый выезд", hero: "Карповый стратег" },
  "Донная ловля": { starter: "Первый заброс донки", hero: "Мастер течения" },
  "Подводная охота": { starter: "Первый безопасный отчёт", hero: "Уважение к воде" },
  "Троллинг": { starter: "Первый маршрут", hero: "Мастер проводки" },
  "Морская рыбалка": { starter: "Первый выход", hero: "Морской исследователь" },
  "Матчевая ловля": { starter: "Первый дальний заброс", hero: "Точный матч" },
  "Болонская ловля": { starter: "Первая проводка", hero: "Мастер проводки" },
  "Тенкара": { starter: "Первая мушка", hero: "Горный рыболов" },
  "Жерлицы": { starter: "Первый зимний отчёт", hero: "Мастер жерлиц" },
  "Другое": { starter: "Первый эксперимент", hero: "Универсал" },
};

export function methodAchievements(stats: FishingSpecialization, method = stats.fishing_method): MethodAchievement[] {
  const flavor = methodFlavors[method] ?? { starter: "Первый выход", hero: "Мастер направления" };
  return [
    { id: "first", name: flavor.starter, category: "Старт",
      description: "Первый зачётный отчёт по дисциплине", instructions: "Опубликуй отчёт, указав эту специализацию. Засчитываются максимум первые два отчёта за сутки.", current: stats.credited_reports, target: 1 },
    { id: "five", name: "Вошёл во вкус", category: "Практика",
      description: "Пять зачётных отчётов", instructions: "Сделай пять отчётов по этому способу ловли. Спешить не нужно: сверх двух отчётов за сутки новые XP не начисляются.", current: stats.credited_reports, target: 5 },
    { id: "twenty", name: flavor.hero, category: "Практика",
      description: "Двадцать зачётных отчётов", instructions: "Веди регулярный дневник рыбалок. Двадцать зачётных отчётов по направлению открывают эту награду.", current: stats.credited_reports, target: 20 },
    { id: "photo", name: "Первый кадр", category: "Старт",
      description: "Один зачётный фотоотчёт", instructions: "Добавь хотя бы одну фотографию к отчёту. Фото может быть водоёма или снастей; оно не доказывает реальность улова.", current: stats.credited_photo_reports, target: 1 },
    { id: "photo5", name: "Дневник в кадрах", category: "Практика",
      description: "Пять зачётных фотоотчётов", instructions: "Публикуй пять отчётов с фото в этой дисциплине. Сохраняй собственные фотографии с рыбалки.", current: stats.credited_photo_reports, target: 5 },
    { id: "catch", name: "Первый улов", category: "Трофеи",
      description: "Один улов, записанный в фотоотчёт", instructions: "В зачётном фотоотчёте укажи рыбу в разделе улова. Это запись автора, не фото-верификация трофея.", current: stats.credited_catches, target: 1 },
    { id: "catch10", name: "Серия уловов", category: "Трофеи",
      description: "Десять зачётных записей об уловах", instructions: "Заполняй уловы в зачётных фотоотчётах. За один отчёт учитывается максимум три записи о рыбе.", current: stats.credited_catches, target: 10 },
    { id: "species3", name: "Разнообразие улова", category: "Трофеи",
      description: "Три разных вида рыб", instructions: "Отметь разные виды в зачётных фотоотчётах. Система сравнивает текст названия, поэтому используй общепринятые названия рыб.", current: stats.distinct_species, target: 3 },
    { id: "water3", name: "Разведчик водоёмов", category: "Исследование",
      description: "Три разных названных водоёма", instructions: "В трёх зачётных фотоотчётах укажи разные водоёмы. Точные GPS-точки не нужны и не публикуются автоматически.", current: stats.distinct_waters, target: 3 },
    { id: "water10", name: "Карта исследователя", category: "Исследование",
      description: "Десять разных названных водоёмов", instructions: "Исследуй разные акватории и публикуй фотоотчёты. Названия вводятся самостоятельно и пока не проверяются по картам.", current: stats.distinct_waters, target: 10 },
    { id: "days3", name: "На своей волне", category: "Практика",
      description: "Три разных дня с зачётными отчётами", instructions: "Отправь по зачётному отчёту в три разных дня. Время считается по календарной дате UTC.", current: stats.active_days, target: 3 },
    { id: "days10", name: "Постоянный участник", category: "Практика",
      description: "Десять активных дней", instructions: "Отмечай рыбалки в десять разных дней по выбранной дисциплине.", current: stats.active_days, target: 10 },
  ];
}
