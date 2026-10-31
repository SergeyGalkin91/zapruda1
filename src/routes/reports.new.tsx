import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, ImagePlus, Trash2, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { FISHING_DISCIPLINES } from "@/lib/disciplines";

export const Route = createFileRoute("/reports/new")({
  head: () => ({
    meta: [
      { title: "Новый отчёт — ZAPRUDA" },
      { name: "description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
      { property: "og:title", content: "Новый отчёт — ZAPRUDA" },
      { property: "og:description", content: "Опишите рыбалку: водоём, погоду, приманки и улов." },
    ],
  }),
  component: NewReport,
});

const COMMON_CIS_FISH = [
  "Белуга",
  "Русский осётр",
  "Сибирский осётр",
  "Амурский осётр",
  "Севрюга",
  "Стерлядь",
  "Калуга",
  "Шип",
  "Ленский осётр",
  "Щука",
  "Амурская щука",
  "Судак",
  "Берш",
  "Окунь",
  "Речной окунь",
  "Морской окунь",
  "Ёрш",
  "Носарь",
  "Жерех",
  "Голавль",
  "Язь",
  "Елец",
  "Плотва",
  "Сорога",
  "Краснопёрка",
  "Уклейка",
  "Верховка",
  "Густера",
  "Лещ",
  "Подлещик",
  "Синец",
  "Белоглазка",
  "Сопа",
  "Чехонь",
  "Рыбец",
  "Вырезуб",
  "Подуст",
  "Храмуля",
  "Кутум",
  "Сазан",
  "Карп",
  "Зеркальный карп",
  "Карась",
  "Золотой карась",
  "Серебряный карась",
  "Линь",
  "Амур белый",
  "Толстолобик белый",
  "Толстолобик пёстрый",
  "Буффало",
  "Усач",
  "Маринка",
  "Осман",
  "Шемая",
  "Тарань",
  "Вобла",
  "Чебак",
  "Ряпушка",
  "Рипус",
  "Сиг",
  "Чир",
  "Пелядь",
  "Муксун",
  "Омуль",
  "Байкальский омуль",
  "Нельма",
  "Тугун",
  "Валёк",
  "Хариус",
  "Сибирский хариус",
  "Европейский хариус",
  "Ленок",
  "Таймень",
  "Дунайский таймень",
  "Форель",
  "Ручьевая форель",
  "Радужная форель",
  "Кумжа",
  "Голец",
  "Арктический голец",
  "Палия",
  "Мальма",
  "Кунджа",
  "Лосось",
  "Сёмга",
  "Горбуша",
  "Кета",
  "Нерка",
  "Кижуч",
  "Чавыча",
  "Сима",
  "Сахалинский таймень",
  "Корюшка",
  "Снеток",
  "Зубатка",
  "Налим",
  "Сом",
  "Европейский сом",
  "Амурский сом",
  "Канальный сомик",
  "Клариевый сом",
  "Ротан",
  "Бычок",
  "Бычок-кругляк",
  "Пескарь",
  "Вьюн",
  "Щиповка",
  "Колюшка",
  "Угорь речной",
  "Минога",
  "Змееголов",
  "Тиляпия",
  "Барабулька",
  "Кефаль",
  "Пиленгас",
  "Лобан",
  "Сингиль",
  "Остронос",
  "Камбала",
  "Калкан",
  "Палтус",
  "Треска",
  "Пикша",
  "Навага",
  "Сайда",
  "Минтай",
  "Хек",
  "Скумбрия",
  "Ставрида",
  "Сельдь",
  "Килька",
  "Хамса",
  "Сарган",
  "Луфарь",
  "Пеламида",
  "Тунец",
  "Катран",
  "Скат",
  "Бычок-песочник",
  "Скорпена",
  "Морской карась",
  "Зубарь",
  "Ласкирь",
  "Морской дракончик",
  "Терпуг",
  "Зеленушка",
  "Баракуда",
  "Карась дальневосточный",
  "Ауха",
  "Верхогляд",
  "Желтощёк",
  "Краснопёр монгольский",
  "Конь-губарь",
  "Амурский чебачок",
  "Тюлька","Пузанок","Черноморская сельдь","Дунайская сельдь","Атерина","Морской язык","Глосса","Лиманда","Ершоватка","Камбала-речная","Камбала-звёздчатая","Камбала-желтоперая","Камбала-полярная","Камбала-ерш","Палтус белокорый","Палтус синекорый","Палтус стрелозубый","Морская лисица","Лакедра","Красный луциан","Дорадо","Сибас","Лаврак","Горбыль","Горбыль тёмный","Горбыль светлый","Спинорог","Зубатка полосатая","Зубатка пятнистая","Морской налим","Менёк","Пинагор","Сельдь атлантическая","Сельдь тихоокеанская","Сельдь каспийская","Каспийский лосось","Каспийская кумжа","Балтийский лосось","Балтийская кумжа","Азовский пузанок","Шпрот","Черноморский шпрот","Судак морской","Судак волжский","Бычок-мартовик","Бычок-ротан","Бычок-травяник","Бычок-цуцик","Бычок-головач","Бычок-ширман","Бычок-гонец","Бычок-кнут","Рыба-игла","Каменный окунь","Речной ерш","Речной рак","Золотистый окунь","Тиляпия мозамбикская","Рыба-сабля","Губан","Зеленуха","Ставрида черноморская","Бычок-подкаменщик","Подкаменщик обыкновенный","Пелядь сибирская","Байкальский сиг","Сиг-пыжьян","Сиг-лудога","Сиг-волховский","Сиг проходной","Белорыбица","Омуль арктический","Омуль сибирский","Корюшка азиатская","Корюшка европейская","Зубастая корюшка","Мойва","Сельдь-черноспинка","Волжская сельдь","Царский лосось","Микижа","Камчатская семга","Голец кунджа","Голец усатый","Голец даватчан","Голец белый","Голец желторотый","Голец озёрный","Краснопёрка дальневосточная","Краснопёрка-угай","Амурский язь","Амурская плотва","Амурский карась","Амурский пескарь","Амурская косатка","Косатка-скрипун","Косатка-плеть","Косатка Герценштейна","Пятнистый конь","Конь пёстрый","Черный лещ","Белый лещ","Мелкочешуйный желтопёр","Толстолобик","Чёрный амур","Белый амур","Шереспер","Судак обыкновенный","Судак каспийский","Берш волжский","Лещ восточный","Карась обыкновенный","Озёрный гольян","Гольян обыкновенный","Гольян-красавка","Гольян Чекановского","Гольян Лаговского","Быстрянка","Быстрянка русская","Быстрянка обыкновенная","Бирючок","Пескарь белопёрый","Пескарь длинноусый","Сибирский пескарь","Амурский пескарь","Жерех красногубый","Карабалык","Аральский усач","Туркестанский усач","Булат-маймай","Маринка обыкновенная","Илийская маринка","Балхашская маринка","Голый осман","Чешуйчатый осман","Балхашский окунь","Балхашский гольян","Иссык-кульский чебачок","Иссык-кульский осман","Иссык-кульская маринка","Аральская плотва","Аральский жерех","Сом Солдатова","Сом обыкновенный","Сом африканский","Амурский голавль","Хариус монгольский","Хариус байкальский","Хариус камчатский","Хариус западносибирский","Таймень сибирский","Ленок тупорылый","Ленок острорылый","Налим сибирский","Угорь европейский","Угорь японский","Солнечный окунь","Форель озёрная","Форель золотая","Радужная форель стальноголовая","Озёрная форель","Кумжа каспийская","Сельдь озёрная","Пузанок каспийский","Кутум каспийский","Рыбец черноморский","Шемая азовская","Шемая каспийская","Елец сибирский","Елец данилевского","Подуст волжский","Подуст обыкновенный","Быстрянка кавказская","Карась маньчжурский","Чебак сибирский","Золотой карась","Карась серебряный","Щука обыкновенная","Щука травянка","Треска атлантическая","Треска тихоокеанская","Терпуг однопёрый","Терпуг восьмилинейный","Терпуг северный","Навага дальневосточная","Навага северная","Нерка карликовая","Кижуч серебристый","Чавыча тихоокеанская","Кета осенняя","Кета летняя","Сима проходная","Сёмга атлантическая","Горбуша тихоокеанская"
] as const;

type Catch = { species: string; weight: string; length: string };
type CatalogWater = { id: string; name: string; region: string; country_code: string };
type CatalogFish = { id: string; name: string };
type CatalogMapping = { waterbody_id: string; species_id: string };

function Label({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t}</span>
      {children}
    </label>
  );
}

function NewReport() {
  const navigate = useNavigate();
  const [catches, setCatches] = useState<Catch[]>([{ species: "", weight: "", length: "" }]);
  const [speciesFocused,setSpeciesFocused]=useState<number|null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [catalogWaters, setCatalogWaters] = useState<CatalogWater[]>([]);
  const [catalogFishes, setCatalogFishes] = useState<CatalogFish[]>([]);
  const [catalogMappings, setCatalogMappings] = useState<CatalogMapping[]>([]);
  const [selectedWaterbody, setSelectedWaterbody] = useState("");
  const [aiWorking, setAiWorking] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pressure, setPressure] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [technique, setTechnique] = useState("");
  const [fishingMethod, setFishingMethod] = useState("");
  const [lures, setLures] = useState("");
  const [story, setStory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedCatches, setSavedCatches] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    let live = true;
    void Promise.all([
      (supabase as any).from("atlas_waterbodies").select("id,name,region,country_code").order("name").limit(500),
      (supabase as any).from("atlas_fish_species").select("id,name").limit(200),
      (supabase as any).from("atlas_waterbody_species").select("waterbody_id,species_id").limit(2500)
    ]).then(([w, f, m]) => {
      if (!live) return;
      if (!w.error) setCatalogWaters(w.data ?? []);
      if (!f.error) setCatalogFishes(f.data ?? []);
      if (!m.error) setCatalogMappings(m.data ?? []);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  function choosePhotos(files: FileList | null) {
    if (savedReportId) return;
    const selected = Array.from(files ?? []);
    if (selected.length > 6) {
      setError("Можно добавить не больше 6 фотографий к отчёту.");
      return;
    }
    const invalid = selected.find((photo) => !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 8 * 1024 * 1024);
    if (invalid) {
      setError("Каждое фото должно быть JPG, PNG или WebP размером до 8 МБ.");
      return;
    }
    setError("");
    setPhotos(selected);
  }

  async function identifyFish() {
    if (!photos.length || aiWorking) return;
    setAiWorking(true);
    setAiMessage("");
    try {
      // Compress locally; do not transmit an oversized original image.
      const bitmap = await createImageBitmap(photos[0]);
      const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Не удалось подготовить фотографию.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const image_data_url = canvas.toDataURL("image/jpeg", 0.72);
      const { data, error: resultError } = await supabase.functions.invoke("identify-fish-photo", {
        body: { image_data_url },
      });
      if (resultError) throw new Error(data?.error || resultError.message);
      if (data?.error) throw new Error(data.error);
      const found = typeof data?.species_common_name === "string" ? data.species_common_name.trim() : "";
      if (found && data?.fish_detected && data?.confidence !== "low") {
        setCatches(current => current.map((row, i) => i === 0 ? { ...row, species: found } : row));
        setAiMessage("ИИ предполагает: " + found + " (уверенность: " +
          (data.confidence === "high" ? "высокая" : "средняя") + "). Проверь название перед публикацией. Это не подтверждение ачивки.");
      } else {
        setAiMessage("ИИ не смог надёжно определить рыбу. Впиши вид вручную — отчёт можно публиковать.");
      }
    } catch (cause) {
      setAiMessage(cause instanceof Error ? cause.message : "ИИ-подсказка пока недоступна. Впиши вид вручную.");
    } finally {
      setAiWorking(false);
    }
  }

    const upd = (i: number, k: keyof Catch, v: string) =>
    setCatches((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Укажи название отчёта.");
      return;
    }
    if (!fishingMethod) {
      setError("Выбери вид рыбалки — по нему будут открываться достижения.");
      return;
    }

    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Сначала войди в аккаунт, потом публикуй отчёт.");

      // Don't create a report with photos until the optional database migration exists.
      if (!savedReportId && photos.length) {
        const { error: photosTableError } = await supabase.from("report_photos").select("id").limit(1);
        if (photosTableError) {
          throw new Error("Фотографии пока не подключены в Supabase. Потребуется миграция report_photos. " + photosTableError.message);
        }
      }

      let reportId = savedReportId;
      if (!reportId) {
        setProgress("Сохраняем отчёт…");
        const { data: report, error: reportError } = await supabase
          .from("fishing_reports")
          .insert({
            user_id: user.id,
            title: cleanTitle,
            body: [story.trim(), technique.trim() ? "Техника: " + technique.trim() : "", lures.trim() ? "Приманки: " + lures.trim() : ""].filter(Boolean).join("

") || null,
            location_name: location.trim() || null,
            weather_summary: weather.trim() || null,
            air_temperature_c: temperature.trim() ? Number(temperature) : null,
            pressure_hpa: pressure.trim() ? Number(pressure) * 1.33322 : null,
            wind_direction: windDirection.trim() || null,
            wind_speed_ms: windSpeed.trim() ? Number(windSpeed) : null,
            is_public: isPublic,
            fishing_method: fishingMethod,
          })
          .select("id")
          .single();
        if (reportError) throw reportError;
        reportId = report.id;
        setSavedReportId(reportId);
      }

      if (!savedCatches) {
        const validCatches = catches.filter((c) => c.species.trim()).map((c) => ({
          report_id: reportId,
          user_id: user.id,
          species: c.species.trim(),
          weight_kg: c.weight.trim() ? Number(c.weight) : null,
          length_cm: c.length.trim() ? Number(c.length) : null,
          technique: technique.trim() || null,
          lure: lures.trim() || null,
        }));
        if (validCatches.length) {
          const { error: catchesError } = await supabase.from("catches").insert(validCatches);
          if (catchesError) throw new Error("Не удалось сохранить улов: " + catchesError.message);
        }
        setSavedCatches(true);
      }

      for (let i = uploadedCount; i < photos.length; i++) {
        const photo = photos[i];
        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${reportId}/${crypto.randomUUID()}.${extension}`;
        setProgress(`Загружаем фото ${i + 1} из ${photos.length}…`);
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(path, photo, { contentType: photo.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw new Error("Не удалось загрузить фото: " + uploadError.message);

        const { error: photoRecordError } = await supabase.from("report_photos").insert({
          report_id: reportId,
          user_id: user.id,
          storage_path: path,
          sort_order: i,
        });
        if (photoRecordError) {
          await supabase.storage.from("report-photos").remove([path]);
          throw new Error("Фото загружено, но не удалось привязать к отчёту: " + photoRecordError.message);
        }
        setUploadedCount(i + 1);
      }
      // Automatically request progress review when report, catch species and photo exist.
      // Any issue with an optional badge must never block a successfully posted fishing report.
      if (selectedWaterbody && photos.length > 0 && reportId) {
        try {
          setProgress("Синхронизируем Атлас рыболова…");
          const [savedFish, savedPhotos] = await Promise.all([
            supabase.from("catches").select("id,species").eq("report_id", reportId),
            supabase.from("report_photos").select("id").eq("report_id", reportId).limit(1),
          ]);
          const photoId = savedPhotos.data?.[0]?.id;
          if (photoId && savedFish.data?.length) {
            for (const caught of savedFish.data) {
              const species = catalogFishes.find(x => x.name.toLowerCase() === caught.species.trim().toLowerCase());
              if (!species || !catalogMappings.some(x => x.waterbody_id === selectedWaterbody && x.species_id === species.id)) continue;
              await (supabase as any).from("atlas_catch_claims").insert({
                user_id: user.id, waterbody_id: selectedWaterbody, species_id: species.id,
                catch_id: caught.id, evidence_photo_id: photoId,
              });
            }
          }
        } catch {
          // Photo, catches and report are already saved; retrying the whole report would duplicate data.
        }
      }
      setProgress("");
      await navigate({ to: "/" });
    } catch (caught) {
      setProgress("");
      const message = caught instanceof Error ? caught.message : "Не удалось опубликовать отчёт.";
      setError(savedReportId ? "Отчёт уже сохранён. " + message + " Можно повторить загрузку." : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <h1 className="mb-6 text-2xl font-bold">Новый отчёт</h1>
      <form className="space-y-6" onSubmit={publish}>
        <section className="panel grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label t="Название отчёта *"><input className="field" placeholder="Например, утро на Кудьме" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required /></Label>
          </div>
          <Label t="Вид рыбалки для достижений *"><select className="field" value={fishingMethod} required onChange={(e) => setFishingMethod(e.target.value)}><option value="" disabled>Выбери дисциплину…</option>{FISHING_DISCIPLINES.map((d) => <option key={d.code} value={d.code}>{d.title}</option>)}</select></Label>
          <Label t="Водоём из Атласа (по желанию)">
            <select className="field" value={selectedWaterbody} onChange={(e) => {
              const id = e.target.value;
              setSelectedWaterbody(id);
              const water = catalogWaters.find(w => w.id === id);
              if (water) setLocation(w.name + (water.region ? " · " + water.region : ""));
            }}>
              <option value="">Не выбирать — обычный отчёт</option>
              {catalogWaters.map(w => <option key={w.id} value={w.id}>{w.name} · {w.region || w.country_code}</option>)}
            </select>
          </Label>
          <Label t="Место (без точных координат)"><input className="field" placeholder="Например, Волга у Нижнего" value={location} onChange={(e) => setLocation(e.target.value)} /></Label>
          <p className="md:col-span-2 text-xs leading-5 text-zinc-400">Для ачивки выбери водоём, укажи пойманный вид и приложи фото ниже. Заявка отправится автоматически после публикации. GPS и отдельные анкеты не нужны.</p>
          <Label t="Погода"><input className="field" placeholder="Пасмурно, небольшой дождь" value={weather} onChange={(e) => setWeather(e.target.value)} /></Label>
          <Label t="Температура, °C"><input className="field" type="number" step="0.1" placeholder="+12" value={temperature} onChange={(e) => setTemperature(e.target.value)} /></Label>
          <Label t="Давление, мм рт. ст."><input className="field" type="number" step="0.1" placeholder="752" value={pressure} onChange={(e) => setPressure(e.target.value)} /></Label>
          <Label t="Направление ветра"><input className="field" placeholder="СЗ" value={windDirection} onChange={(e) => setWindDirection(e.target.value)} /></Label>
          <Label t="Ветер, м/с"><input className="field" type="number" min="0" step="0.1" placeholder="4" value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} /></Label>
          <Label t="Техника ловли"><input className="field" placeholder="Джиг, ступенька" value={technique} onChange={(e) => setTechnique(e.target.value)} /></Label>
          <Label t="Приманки"><input className="field" placeholder="Виброхвост 3”, колебалка 10 г" value={lures} onChange={(e) => setLures(e.target.value)} /></Label>
          <div className="md:col-span-2">
            <Label t="Рассказ"><textarea className="field min-h-28" placeholder="Как прошла рыбалка? Где стоял, что пробовал, были ли поклёвки?" value={story} onChange={(e) => setStory(e.target.value)} /></Label>
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Опубликовать в общей ленте
          </label>
        </section>

        <section className="panel space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-lime-300/30 bg-lime-300/10 text-lime-300">
              <Camera className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Фотографии с рыбалки</h2>
              <p className="text-xs text-muted-foreground">До 6 фотографий · JPG, PNG, WebP · до 8 МБ каждая</p>
            </div>
          </div>
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-lime-300/35 bg-lime-300/[0.035] px-4 py-5 text-sm font-semibold text-lime-300 transition hover:bg-lime-300/10 ${savedReportId ? "pointer-events-none opacity-50" : ""}`}>
            <ImagePlus className="size-5" aria-hidden="true" />
            {photos.length ? "Заменить выбранные фотографии" : "Выбрать фотографии"}
            <input
              aria-label="Выбрать фотографии с рыбалки"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={Boolean(savedReportId)}
              className="sr-only"
              onChange={(e) => choosePhotos(e.target.files)}
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {previews.map((src, index) => (
                <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
                  <img src={src} alt={`Фото к отчёту ${index + 1}`} className="size-full object-cover" />
                  {!savedReportId && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-lg bg-black/75 p-2 text-white transition hover:bg-black"
                      onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Убрать фотографию ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {photos.length > 0 && <div className="rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-3">
            <button className="btn-ghost inline-flex items-center gap-2" type="button" disabled={aiWorking}
              onClick={() => void identifyFish()}>
              <Sparkles className="size-4 text-[#D7FF35]" />{aiWorking ? "Рассматриваем фото…" : "Подсказать вид рыбы по фото (ИИ)"}
            </button>
            <p className="mt-2 text-xs text-zinc-400">Опционально: изображение отправляется ИИ только после твоего нажатия. Результат можно исправить.</p>
            {aiMessage && <p className="mt-2 text-xs text-[#D7FF35]" role="status">{aiMessage}</p>}
          </div>}
          <p className="text-xs leading-5 text-muted-foreground">
            Файлы сохраняются в защищённом хранилище. Фотографии общедоступных отчётов будут видны в ленте;
            фото закрытых отчётов останутся доступны только владельцу.
          </p>
        </section>

        <section className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Улов</h2>
            <button type="button" className="btn-ghost" onClick={() => setCatches((c) => [...c, { species: "", weight: "", length: "" }])}>+ Рыба</button>
          </div>
          <p className="text-xs text-zinc-400">Выбирай рыбу по названию — справочник включает речные, озёрные и морские виды России и СНГ. Для редких видов возможен ручной ввод. Соблюдай ограничения на вылов и охраняемые виды.</p>
          {catches.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <div className="relative col-span-2 sm:col-span-1">
                <input className="field w-full" autoComplete="off" placeholder="Начни вводить вид рыбы…" value={c.species}
                  onFocus={()=>setSpeciesFocused(i)} onBlur={()=>window.setTimeout(()=>setSpeciesFocused(current=>current===i?null:current),150)}
                  onChange={(e)=>{upd(i,"species",e.target.value);setSpeciesFocused(i);}}/>
                {speciesFocused===i&&(()=>{
                  const all=Array.from(new Set([...COMMON_CIS_FISH,...catalogFishes.map(f=>f.name)]));
                  const query=c.species.trim().toLocaleLowerCase("ru");
                  const filtered=all.filter(name=>!query||name.toLocaleLowerCase("ru").includes(query)).sort((a,b)=>{
                    const ap=query&&a.toLocaleLowerCase("ru").startsWith(query)?0:1;
                    const bp=query&&b.toLocaleLowerCase("ru").startsWith(query)?0:1;
                    return ap-bp||a.localeCompare(b,"ru");
                  }).slice(0,25);
                  return <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#D7FF35]/35 bg-[#111912] p-1 shadow-xl shadow-black/70">
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#D7FF35]">{query?"Найденные виды":"Выбери вид или начни ввод"} · {filtered.length}{!query?" из каталога":""}</p>
                    {filtered.map(name=><button key={name} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{upd(i,"species",name);setSpeciesFocused(null);}} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-[#D7FF35]/15 hover:text-[#D7FF35]">{name}</button>)}
                    {!filtered.length&&<p className="px-3 py-2 text-xs text-zinc-400">Нет в каталоге? Оставь введённое название.</p>}
                  </div>;
                })()}
              </div>
              <input className="field" type="number" min="0" step="0.01" placeholder="Вес, кг" value={c.weight} onChange={(e) => upd(i, "weight", e.target.value)} />
              <input className="field" type="number" min="0" step="0.1" placeholder="Длина, см" value={c.length} onChange={(e) => upd(i, "length", e.target.value)} />
              <button type="button" className="btn-ghost" aria-label="Удалить" onClick={() => setCatches((x) => x.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </section>

        {error && <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive" role="alert">{error}</p>}
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={saving}>{saving ? "Сохраняем…" : savedReportId ? "Завершить загрузку" : "Опубликовать отчёт"}</button>
          {progress && <span className="text-xs text-lime-300" role="status">{progress}</span>}
        </div>
      </form>
    </Shell>
  );
}
