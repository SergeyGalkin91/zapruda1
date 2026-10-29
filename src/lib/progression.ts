/**
 * ZAPRUDA in-app progression.
 * These are community activity ranks, not official sporting qualifications.
 * XP is derived from database records by my_fishing_progress(), not user-editable.
 */
export type FishingProgress = {
  report_count: number;
  catches_count: number;
  photo_count: number;
  photo_reports: number;
  reactions_received: number;
  trips_organized: number;
  heaviest_catch_kg: number | null;
};

export const EMPTY_PROGRESS: FishingProgress = {
  report_count: 0,
  catches_count: 0,
  photo_count: 0,
  photo_reports: 0,
  reactions_received: 0,
  trips_organized: 0,
  heaviest_catch_kg: null,
};

export const FISHING_RANKS = [
  { minXp: 0, title: "Новичок", motto: "Первые шаги к воде", symbol: "01" },
  { minXp: 100, title: "Любитель", motto: "Рыбалка в удовольствие", symbol: "02" },
  { minXp: 300, title: "Увлечённый", motto: "Знает свой водоём", symbol: "03" },
  { minXp: 700, title: "Спиннингист", motto: "Уверенно владеет снастью", symbol: "04" },
  { minXp: 1400, title: "Опытный рыболов", motto: "Делится опытом", symbol: "05" },
  { minXp: 2600, title: "Мастер водоёмов", motto: "Исследует новые места", symbol: "06" },
  { minXp: 4500, title: "Эксперт ZAPRUDA", motto: "Лидер сообщества", symbol: "07" },
  { minXp: 7000, title: "Профессионал ZAPRUDA", motto: "Легенда сообщества", symbol: "08" },
] as const;

export const ACTIVITY_XP = {
  report: 50,
  catch: 25,
  photoReport: 15,
  reactionFromOtherUser: 5,
  organizedTrip: 40,
} as const;

export function totalExperience(progress: FishingProgress): number {
  return Math.max(0, progress.report_count) * ACTIVITY_XP.report
    + Math.max(0, progress.catches_count) * ACTIVITY_XP.catch
    + Math.max(0, progress.photo_reports) * ACTIVITY_XP.photoReport
    + Math.max(0, progress.reactions_received) * ACTIVITY_XP.reactionFromOtherUser
    + Math.max(0, progress.trips_organized) * ACTIVITY_XP.organizedTrip;
}

export function currentRank(xp: number) {
  const currentIndex = FISHING_RANKS.findLastIndex((rank) => xp >= rank.minXp);
  const rankIndex = Math.max(0, currentIndex);
  const rank = FISHING_RANKS[rankIndex];
  const next = FISHING_RANKS[rankIndex + 1] ?? null;
  return {
    rank,
    rankIndex,
    next,
    pointsToNext: next ? Math.max(0, next.minXp - xp) : 0,
    percent: next ? Math.min(100, Math.max(0, ((xp - rank.minXp) / (next.minXp - rank.minXp)) * 100)) : 100,
  };
}

export type AchievementCategory = "Первые шаги" | "Улов" | "Свой среди своих" | "Истории";
export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  current: number;
  target: number;
  unlocked: boolean;
};

export function getAchievements(p: FishingProgress): Achievement[] {
  const entries: Array<Omit<Achievement, "unlocked">> = [
    { id: "first_report", title: "Первый заброс", description: "Опубликуй первый отчёт", category: "Первые шаги", current: p.report_count, target: 1 },
    { id: "five_reports", title: "Рыбалка затянула", description: "Опубликуй пять отчётов", category: "Первые шаги", current: p.report_count, target: 5 },
    { id: "twenty_reports", title: "Рыболовный дневник", description: "Опубликуй 20 отчётов", category: "Первые шаги", current: p.report_count, target: 20 },
    { id: "fifty_reports", title: "Легенда отчётов", description: "Опубликуй 50 отчётов", category: "Первые шаги", current: p.report_count, target: 50 },
    { id: "first_catch", title: "Первая рыба", description: "Укажи рыбу в отчёте", category: "Улов", current: p.catches_count, target: 1 },
    { id: "ten_catches", title: "Охотник за хищником", description: "Зафиксируй десять рыб", category: "Улов", current: p.catches_count, target: 10 },
    { id: "trophy", title: "Трофейный экземпляр", description: "Отметь рыбу весом от 3 кг", category: "Улов", current: p.heaviest_catch_kg ?? 0, target: 3 },
    { id: "first_partner", title: "Организатор", description: "Создай первый совместный выезд", category: "Свой среди своих", current: p.trips_organized, target: 1 },
    { id: "five_trips", title: "Капитан команды", description: "Организуй пять выездов", category: "Свой среди своих", current: p.trips_organized, target: 5 },
    { id: "ten_reactions", title: "Свой человек", description: "Получи десять реакций от других рыбаков", category: "Свой среди своих", current: p.reactions_received, target: 10 },
    { id: "fifty_reactions", title: "Любимец сообщества", description: "Получи пятьдесят реакций", category: "Свой среди своих", current: p.reactions_received, target: 50 },
    { id: "first_photo", title: "Фоторыбак", description: "Прикрепи фото к отчёту", category: "Истории", current: p.photo_reports, target: 1 },
    { id: "five_photo_reports", title: "Летописец", description: "Создай пять фотоотчётов", category: "Истории", current: p.photo_reports, target: 5 },
  ];
  return entries.map((item) => ({ ...item, unlocked: item.current >= item.target }));
}
