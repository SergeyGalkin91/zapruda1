// Extensible country catalog. Regions and cities will come from the database.
export type Country = { code: string; name: string; flag: string; group: "cis" };

export const countries: Country[] = [
  { code: "RU", name: "Россия", flag: "🇷🇺", group: "cis" },
  { code: "BY", name: "Беларусь", flag: "🇧🇾", group: "cis" },
  { code: "KZ", name: "Казахстан", flag: "🇰🇿", group: "cis" },
  { code: "AM", name: "Армения", flag: "🇦🇲", group: "cis" },
  { code: "AZ", name: "Азербайджан", flag: "🇦🇿", group: "cis" },
  { code: "KG", name: "Кыргызстан", flag: "🇰🇬", group: "cis" },
  { code: "MD", name: "Молдова", flag: "🇲🇩", group: "cis" },
  { code: "TJ", name: "Таджикистан", flag: "🇹🇯", group: "cis" },
  { code: "UZ", name: "Узбекистан", flag: "🇺🇿", group: "cis" },
  { code: "TM", name: "Туркменистан", flag: "🇹🇲", group: "cis" },
];

export const topics = ["Спиннинг", "Щука", "Судак", "Окунь", "Жерех", "Приманки и снасти"];
