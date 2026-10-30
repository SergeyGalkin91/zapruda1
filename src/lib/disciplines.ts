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
  catches_count: number;
  credited_catches: number;
  photo_reports: number;
  distinct_waters: number;
  heaviest_catch_kg: number | null;
};

export const METHOD_RANKS = [
  { minXp: 0, name: "Первопроходец" },
  { minXp: 75, name: "Практик" },
  { minXp: 225, name: "Увлечённый" },
  { minXp: 550, name: "Опытный" },
  { minXp: 1200, name: "Мастер техники" },
  { minXp: 2500, name: "Эксперт направления" },
] as const;

export function methodExperience(stats: FishingSpecialization) {
  return Math.max(0,stats.report_count)*50
    + Math.max(0,stats.credited_catches)*20
    + Math.max(0,stats.photo_reports)*10
    + Math.max(0,stats.distinct_waters)*15;
}

export function methodLevel(xp: number) {
  const index=Math.max(0,METHOD_RANKS.findLastIndex((rank)=>xp>=rank.minXp));
  const current=METHOD_RANKS[index];
  const next=METHOD_RANKS[index+1]??null;
  const percent=next?Math.max(0,Math.min(100,100*(xp-current.minXp)/(next.minXp-current.minXp))):100;
  return {index,current,next,percent};
}

export function methodAchievements(stats: FishingSpecialization) {
  return [
    { id:"first",name:"Первые шаги",description:"Первый отчёт по дисциплине",current:stats.report_count,target:1 },
    { id:"regular",name:"Вошёл во вкус",description:"Пять отчётов по направлению",current:stats.report_count,target:5 },
    { id:"persistent",name:"Верность делу",description:"Двадцать отчётов",current:stats.report_count,target:20 },
    { id:"catch",name:"Встреча с рыбой",description:"Первый отмеченный улов",current:stats.catches_count,target:1 },
    { id:"catch10",name:"Серия уловов",description:"Десять рыб в отчётах",current:stats.catches_count,target:10 },
    { id:"photo",name:"В кадре",description:"Фотоотчёт по выбранному способу",current:stats.photo_reports,target:1 },
    { id:"waters",name:"Разведчик водоёмов",description:"Три разных названных водоёма",current:stats.distinct_waters,target:3 },
    { id:"waters10",name:"Карта исследователя",description:"Десять разных водоёмов",current:stats.distinct_waters,target:10 },
  ];
}
