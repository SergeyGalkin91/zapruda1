/** Curated suggestions, not a live store catalogue. Users can enter any brand/model. */
export type TackleType = "rod" | "reel" | "line" | "lure" | "other";
export type TackleItem = {
  id: string;
  user_id: string;
  gear_type: TackleType;
  brand: string;
  model: string;
  variant: string;
  notes: string;
};

export const TACKLE_CATEGORIES = [
  { value: "rod", label: "Удилище" },
  { value: "reel", label: "Катушка" },
  { value: "line", label: "Леска / плетёнка" },
  { value: "lure", label: "Приманка" },
  { value: "other", label: "Другое" },
] as const;

export const TACKLE_BRANDS: Record<TackleType,string[]> = {
  reel: [
    "Daiwa","Shimano","Okuma","Abu Garcia","Penn","Ryobi","Stinger","Nautilus","Favorite",
    "Piscifun","Zetrix","Dragon","Flagman","Salmo","Kaida","Tsurinoya","KastKing",
    "Mitchell","13 Fishing","Quantum","Spro","Fox Rage","Savage Gear","Browning",
    "Tica","Balzer","Mikado","Cormoran","DAM","Zebco","Другой бренд",
  ],
  rod: [
    "Narval","Zemex","Daiwa","Shimano","Nautilus","Zetrix","Maximus","Favorite",
    "Major Craft","Graphiteleader","St.Croix","Evergreen","Tict","Crazy Fish","Hearty Rise",
    "Norstream","Black Hole","Aiko","Pontoon21","Abu Garcia","Savage Gear","Salmo",
    "Kaida","Mikado","Kuying","Tsurinoya","Flagman","Volzhanka","Metsui","Другой бренд",
  ],
  line: [
    "YGK","Duel","Varivas","Sunline","Daiwa","Shimano","Seaguar","Berkley","PowerPro",
    "Sufix","Gosen","Momoi","Kureha","Owner","Toray","SpiderWire","J-Braid",
    "Major Craft","Salmo","Nautilus","Pontoon21","X-Braid","Другой бренд",
  ],
  lure: [
    "Narval","Sawamura","Keitech","Lucky John","Daiwa","Shimano","Savage Gear",
    "Relax","Mann's","Reins","Bait Breath","Fish Arrow","Kosadaka","Pontoon21",
    "Megabass","Jackall","ZipBaits","Duo","Smith","Rapala","Yo-Zuri","TsuYoki",
    "Kaida","Owner","Evergreen","Storm","Berkley","Другой бренд",
  ],
  other: [
    "Garmin","Lowrance","Humminbird","Deeper","Daiwa","Shimano","Narval",
    "Nautilus","Другой бренд",
  ],
};

/** Model families are only autocomplete hints, not an exhaustive model listing. */
export const TACKLE_MODELS: Record<string,string[]> = {
  Daiwa: [
    "Legalis LT", "23 Legalis LT", "Legalis LT 2500D","Prorex X LT","24 Prorex X LT",
    "Fuego LT","Exceler LT","Ninja LT","Caldia LT","Freams LT","Ballistic LT",
    "Certate LT","Exist LT","Tatula","Revros LT","Crossfire LT","Aird LT",
    "J-Braid X8","J-Braid Grand X8","Saltiga",
  ],
  Shimano: [
    "Sahara","Sedona","Nasci","Stradic","Vanford","Twin Power","Stella","Ultegra",
    "Miravel","Catana","Nexave","Vanquish","Aero","Zodias","Expride","Yasei",
    "Kairiki 8","Pitbull",
  ],
  Narval: [
    "Euphoria","Argument II","Argument","Choppy Tail","Commander Shad",
    "Frost Candy","Fishing Shad","Complex Shad",
  ],
  Zemex: ["Solid","24 Solid","Viper","Buriza","Spider Z-10","Extra Rock Fish","Grand Feeder"],
  Nautilus: ["Black Rock","Cross Blade","Arta","Basilisk","Verona","X-Fish"],
  YGK: ["X-Braid Upgrade X8","X-Braid Pentagram","X-Braid Olltlos","X-Braid WX8"],
  Duel: ["PE Super X-Wire 8","Egi Metal Wax 4","Hardcore X8","Hardcore X4"],
  Okuma: ["Ceymar","Inspira","Epixor","Azores","Helios"],
  "Abu Garcia": ["Revo","Max","Revo SX","Revo MGX","Orra","Cardinal"],
  "Major Craft": ["Crostage","Firstcast","Solpara","Days","Triple Cross"],
  "Savage Gear": ["SG2","SG4","SG6","Cannibal Shad","3D Roach"],
  Keitech: ["Easy Shiner","Swing Impact","Fat Swing Impact"],
  "Lucky John": ["Tioga","Ballist","Long John","Basara"],
  Garmin: ["Panoptix PS22","Panoptix PS30","LiveScope LVS32","LiveScope LVS34","LiveScope 2 LVS42"],
  Lowrance: ["Elite FS","HDS Pro","ActiveTarget"],
  Humminbird: ["Helix","Solix","Apex","MEGA Live"],
};

export const REEL_SIZES = [
  "500","1000","2000","2000S","2500","2500S","2500D","2500-C","3000",
  "3000-C","3000-CXH","4000","4000-C","5000","6000","Другое",
] as const;

export function formatTackleItem(item: Pick<TackleItem,"brand"|"model"|"variant">) {
  return [item.brand,item.model,item.variant].filter(Boolean).join(" ").trim();
}
