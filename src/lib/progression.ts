export type FishingRank = {
  minXp: number;
  title: string;
  motto: string;
  perk: string;
};

export const FISHING_RANKS: readonly FishingRank[] = [
  {
    minXp: 0,
    title: "Новичок у воды",
    motto: "Первые забросы и первые уроки",
    perk: "Открыт базовый трек ачивок",
  },
  {
    minXp: 120,
    title: "Береговой практик",
    motto: "Уже понимаешь воду и сезон",
    perk: "Быстрее копятся очки за регулярность",
  },
  {
    minXp: 350,
    title: "Уверенный рыболов",
    motto: "Стабильный результат без суеты",
    perk: "Расширенный доступ к дисциплинам",
  },
  {
    minXp: 800,
    title: "Опытный охотник",
    motto: "Читаешь водоём как карту",
    perk: "Бонус к сложным ачивкам",
  },
  {
    minXp: 1600,
    title: "Мастер воды",
    motto: "Техника, терпение и точный выбор",
    perk: "Приоритет в рейтингах сообщества",
  },
  {
    minXp: 3000,
    title: "Легенда ZAPRUDA",
    motto: "Эталон для комьюнити",
    perk: "Максимальный статус прогрессии",
  },
] as const;

export function rankForXp(xp: number): FishingRank {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let current = FISHING_RANKS[0]!;
  for (let i = FISHING_RANKS.length - 1; i >= 0; i -= 1) {
    const candidate = FISHING_RANKS[i]!;
    if (value >= candidate.minXp) {
      current = candidate;
      break;
    }
  }
  return current;
}

export function nextRankForXp(xp: number): FishingRank | null {
  const value = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  for (const rank of FISHING_RANKS) {
    if (value < rank.minXp) return rank;
  }
  return null;
}
