import { streetStorageKey } from "@/lib/street-storage";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ImagePlus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  MobileField,
  SingleFieldProgress,
  SingleFieldStage,
  StickyFormActions,
} from "@/components/MobileForm";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { FISHING_DISCIPLINES } from "@/lib/disciplines";
import { prepareReportPhoto } from "@/lib/report-photo";
import {
  clearReportHandoff,
  createReportHandoff,
  saveReportHandoff,
} from "@/lib/report-big-fish-handoff";
import { isSpotStaging } from "@/lib/spot-api";

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

type Catch = { species: string; weight: string; length: string };
type CatalogWater = { id: string; name: string; region: string; country_code: string };
type CatalogFish = { id: string; name: string };
type CatalogMapping = { waterbody_id: string; species_id: string };

const reportSteps = [
  "location",
  "date",
  "title",
  "discipline",
  "catch",
  "story",
  "photos",
  "review",
] as const;
const additionalSteps = [
  "atlas",
  "tackle",
  "technique",
  "lures",
  "weather",
  "temperature",
  "pressure",
  "windDirection",
  "windSpeed",
] as const;
type ReportStep =
  (typeof reportSteps)[number] | (typeof additionalSteps)[number] | "weight" | "length";
const emptyCatch = (): Catch => ({ species: "", weight: "", length: "" });

export function NewReport() {
  const navigate = useNavigate();
  const [catches, setCatches] = useState<Catch[]>([emptyCatch()]);
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
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [progress, setProgress] = useState("");
  const draftKey = useRef<string | null>(null);
  const publicationId = useRef<string | null>(null);
  const alive = useRef(true);
  const photoUploadIds = useRef(new Map<File, string>());
  const [step, setStep] = useState<ReportStep>("location");
  const [editing, setEditing] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [catchIndex, setCatchIndex] = useState(0);
  const [draftNotice, setDraftNotice] = useState("");
  const publishing = useRef(false);
  const [titleError, setTitleError] = useState("");
  const [fishedOn, setFishedOn] = useState("");
  const [tackle, setTackle] = useState("");
  const [draftWarning, setDraftWarning] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  useEffect(() => {
    let active = true;
    alive.current = true;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) return;
        if (data.user) {
          const key = "zapruda-report-draft-v1-" + data.user.id;
          draftKey.current = key;
          publicationId.current = crypto.randomUUID();
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const saved = JSON.parse(raw) as Record<string, unknown>;
              if (
                typeof saved["publicationId"] === "string" &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  saved["publicationId"],
                )
              )
                publicationId.current = saved["publicationId"];
              const val = (k: string) => (typeof saved[k] === "string" ? (saved[k] as string) : "");
              const question = saved["question"] as ReportStep;
              if ([...reportSteps, ...additionalSteps, "weight", "length"].includes(question)) {
                setStep(question);
                setEditing(saved["editing"] === true);
              } else {
                setStep(
                  saved["step"] === 3 ? "review" : saved["step"] === 2 ? "catch" : "location",
                );
              }
              setFishedOn(val("fishedOn"));
              setTackle(val("tackle"));
              setTitle(val("title"));
              setLocation(val("location"));
              setWeather(val("weather"));
              setTemperature(val("temperature"));
              setPressure(val("pressure"));
              setWindDirection(val("windDirection"));
              setWindSpeed(val("windSpeed"));
              setTechnique(val("technique"));
              setFishingMethod(val("fishingMethod"));
              setLures(val("lures"));
              setStory(val("story"));
              setSelectedWaterbody(val("selectedWaterbody"));
              if (Array.isArray(saved["catches"])) {
                const storedCatches = saved["catches"]
                  .filter(
                    (c): c is Catch =>
                      !!c &&
                      typeof c === "object" &&
                      typeof c.species === "string" &&
                      typeof c.weight === "string" &&
                      typeof c.length === "string",
                  )
                  .slice(0, 20);
                setCatches(storedCatches.length ? storedCatches : [emptyCatch()]);
                const index = Number(saved["catchIndex"]);
                if (Number.isInteger(index) && index >= 0 && index < storedCatches.length)
                  setCatchIndex(index);
              }
              if (typeof saved["isPublic"] === "boolean") setIsPublic(saved["isPublic"]);
              setDraftRestored(true);
            }
          } catch {
            /* Invalid drafts never block reporting. */
          }
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, []);
  const draftPayload = JSON.stringify({
    publicationId: publicationId.current,
    step:
      step === "review"
        ? 3
        : ["catch", "weight", "length", "story", "photos"].includes(step)
          ? 2
          : 1,
    question: step,
    catchIndex,
    editing,
    fishedOn,
    tackle,
    title,
    location,
    weather,
    temperature,
    pressure,
    windDirection,
    windSpeed,
    technique,
    fishingMethod,
    lures,
    story,
    selectedWaterbody,
    catches,
    isPublic,
  });

  useEffect(() => {
    if (!draftReady || !draftKey.current || savedReportId) return;
    try {
      localStorage.setItem(draftKey.current, draftPayload);
    } catch {
      setDraftWarning("Автосохранение недоступно. Не закрывай страницу до публикации.");
    }
  }, [draftPayload, draftReady, savedReportId]);

  function importStreetSession() {
    if (savedReportId || saving) return;
    try {
      const raw = localStorage.getItem(
        streetStorageKey(draftKey.current?.slice("zapruda-report-draft-v1-".length)),
      );
      if (!raw) {
        setError("Street-сессия не найдена в этом браузере.");
        return;
      }
      const value: unknown = JSON.parse(raw);
      if (
        !value ||
        typeof value !== "object" ||
        !("finishedAt" in value) ||
        typeof value.finishedAt !== "string"
      ) {
        setError("Сначала заверши Street-сессию, затем перенеси данные.");
        return;
      }
      const street = value as {
        startedAt?: unknown;
        area?: unknown;
        tackle?: unknown;
        lures?: unknown;
        notes?: unknown;
        catches?: unknown;
        finishedAt: string;
        importedAt?: unknown;
      };
      if (typeof street.startedAt !== "string" || !Number.isFinite(Date.parse(street.startedAt))) {
        setError("Данные Street-сессии повреждены.");
        return;
      }
      if (
        typeof street.importedAt === "string" &&
        !window.confirm("Эта Street-сессия уже переносилась. Импортировать повторно?")
      )
        return;
      if (
        (title.trim() ||
          location.trim() ||
          story.trim() ||
          catches.some((c) => c.species.trim())) &&
        !window.confirm(
          "В форме уже есть данные. Заменить название, место и уловы данными Street-сессии?",
        )
      )
        return;
      const area = typeof street.area === "string" ? street.area.slice(0, 100) : "";
      const items = Array.isArray(street.catches)
        ? street.catches
            .filter(
              (c): c is { species: string; note?: string } =>
                !!c && typeof c === "object" && typeof c.species === "string",
            )
            .slice(0, 20)
        : [];
      setTitle(("Street Fishing · " + (area || "городской выход")).slice(0, 120));
      setLocation(area);
      setCatches(
        items.length
          ? items.map((c) => ({ species: c.species.slice(0, 80), weight: "", length: "" }))
          : [{ species: "", weight: "", length: "" }],
      );
      const notes = typeof street.notes === "string" ? street.notes.slice(0, 1000) : "";
      setStory(
        (
          "Street-сессия от " +
          new Date(street.startedAt).toLocaleString("ru-RU") +
          ". Уловов: " +
          items.length +
          (notes ? "\nЗаметки: " + notes : "") +
          items.map((c) => "\n• " + c.species + (c.note ? " — " + c.note : "")).join("")
        ).slice(0, 3000),
      );
      setTackle(typeof street.tackle === "string" ? street.tackle : "");
      setLures(typeof street.lures === "string" ? street.lures : "");
      setFishedOn(street.startedAt.slice(0, 10));
      setCatchIndex(0);
      setEditing(false);
      setStep("location");
      setIsPublic(false);
      setError("");
      try {
        localStorage.setItem(
          streetStorageKey(draftKey.current?.slice("zapruda-report-draft-v1-".length)),
          JSON.stringify({ ...street, importedAt: new Date().toISOString() }),
        );
      } catch {
        /* Warning is best effort; source session remains intact. */
      }
    } catch {
      setError("Не удалось прочитать Street-сессию. Исходные данные сохранены.");
    }
  }

  function clearLocalDraft() {
    publicationId.current = crypto.randomUUID();
    if (draftKey.current) {
      try {
        localStorage.removeItem(draftKey.current);
      } catch {
        // A blocked browser store must not prevent completing the report.
      }
    }
    setDraftRestored(false);
    setCatchIndex(0);
    setEditing(false);
    setStep("location");
    setFishedOn("");
    setTackle("");
    setPhotos([]);
    setTitle("");
    setLocation("");
    setWeather("");
    setTemperature("");
    setPressure("");
    setWindDirection("");
    setWindSpeed("");
    setTechnique("");
    setFishingMethod("");
    setLures("");
    setStory("");
    setSelectedWaterbody("");
    setCatches([{ species: "", weight: "", length: "" }]);
    setIsPublic(false);
  }

  useEffect(() => {
    let live = true;
    void Promise.all([
      supabase
        .from("atlas_waterbodies")
        .select("id,name,region,country_code")
        .order("name")
        .limit(500),
      supabase.from("atlas_fish_species").select("id,name").limit(200),
      supabase.from("atlas_waterbody_species").select("waterbody_id,species_id").limit(2500),
    ])
      .then(([w, f, m]) => {
        if (!live) return;
        if (!w.error) setCatalogWaters(w.data ?? []);
        if (!f.error) setCatalogFishes(f.data ?? []);
        if (!m.error) setCatalogMappings(m.data ?? []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
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
    const invalid = selected.find(
      (photo) =>
        !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
        photo.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setError("Каждое фото должно быть JPG, PNG или WebP размером до 8 МБ.");
      return;
    }
    setError("");
    setPhotos(selected);
  }

  async function identifyFish() {
    const photo = photos[0];
    if (!photo || aiWorking) return;
    const actor = draftKey.current?.slice("zapruda-report-draft-v1-".length);
    setAiWorking(true);
    setAiMessage("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!alive.current) return;
      if (
        sessionError ||
        !actor ||
        sessionData.session?.user.id !== actor ||
        sessionData.session.user.is_anonymous ||
        !sessionData.session.user.email_confirmed_at
      )
        throw new Error("Confirmed session required");
      const token = sessionData.session.access_token;
      // Compress locally; do not transmit an oversized original image.
      const bitmap = await createImageBitmap(photo);
      if (!alive.current) {
        bitmap.close();
        return;
      }
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
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!alive.current) return;
      if (resultError) throw new Error(data?.error || resultError.message);
      if (data?.error) throw new Error(data.error);
      const found =
        typeof data?.species_common_name === "string" ? data.species_common_name.trim() : "";
      if (found && data?.fish_detected && data?.confidence !== "low") {
        setCatches((current) =>
          current.map((row, i) => (i === 0 ? { ...row, species: found } : row)),
        );
        setAiMessage(
          "ИИ предполагает: " +
            found +
            " (уверенность: " +
            (data.confidence === "high" ? "высокая" : "средняя") +
            "). Проверь название перед публикацией. Это не подтверждение ачивки.",
        );
      } else {
        setAiMessage(
          "ИИ не смог надёжно определить рыбу. Впиши вид вручную — отчёт можно публиковать.",
        );
      }
    } catch {
      if (alive.current) setAiMessage("ИИ-подсказка пока недоступна. Впиши вид вручную.");
    } finally {
      if (alive.current) setAiWorking(false);
    }
  }

  const upd = (i: number, k: keyof Catch, v: string) =>
    setCatches((c) => c.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function publish(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (publishing.current) return;
    if (step !== "review") {
      nextStep(e.currentTarget);
      return;
    }
    setError("");
    const actor = draftKey.current?.slice("zapruda-report-draft-v1-".length);
    if (!actor) {
      setError("Сначала войди в аккаунт, потом публикуй отчёт.");
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Укажи название отчёта.");
      return;
    }
    if (!fishingMethod) {
      setError("Выбери вид рыбалки — по нему будут открываться достижения.");
      return;
    }

    const numbers = [
      { label: "Температура", value: temperature, min: -70, max: 65 },
      { label: "Давление", value: pressure, min: 500, max: 900 },
      { label: "Ветер", value: windSpeed, min: 0, max: 90 },
      ...catches.flatMap((c, index) => [
        { label: "Вес рыбы №" + (index + 1), value: c.weight, min: 0, max: 1000 },
        { label: "Длина рыбы №" + (index + 1), value: c.length, min: 0, max: 1000 },
      ]),
    ];
    const invalidNumber = numbers.find(
      ({ value, min, max }) =>
        value.trim() !== "" &&
        (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max),
    );
    if (invalidNumber) {
      setError("Проверь поле «" + invalidNumber.label + "»: число вне допустимого диапазона.");
      return;
    }
    publishing.current = true;
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!alive.current) return;
      if (authError) throw authError;
      const user = authData.user;
      if (!user) throw new Error("Сначала войди в аккаунт, потом публикуй отчёт.");
      if (user.id !== actor) throw new Error("Сессия изменилась. Открой отчёт из своего аккаунта.");
      if (user.is_anonymous || !user.email_confirmed_at)
        throw new Error("Подтверди почту, чтобы публиковать отчёты.");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!alive.current) return;
      if (
        sessionError ||
        sessionData.session?.user.id !== actor ||
        !sessionData.session.access_token
      )
        throw new Error("Сессия изменилась. Открой отчёт из своего аккаунта.");
      const authorization = `Bearer ${sessionData.session.access_token}`;

      // Verify the catch store before any report INSERT when fish were entered.
      // A no-catch outing must not probe or create a fish record.
      const hasCatches = catches.some((caught) => caught.species.trim());
      if (hasCatches) {
        const { error: catchStoreError } = await supabase.from("catches").select("id").limit(1);
        if (!alive.current) return;
        if (catchStoreError)
          throw new Error("Публикация временно недоступна. Черновик сохранён — попробуй позже.");
      }

      // Don't create a report with photos until the optional database migration exists.
      if (!savedReportId && photos.length) {
        const { error: photosTableError } = await supabase
          .from("report_photos")
          .select("id")
          .limit(1);
        if (!alive.current) return;
        if (photosTableError) {
          throw new Error(
            "Публикация с фотографиями временно недоступна. Черновик сохранён — попробуй позже.",
          );
        }
      }

      let reportId = savedReportId;
      if (!reportId) {
        setProgress("Сохраняем отчёт…");
        const values = {
          title: cleanTitle,
          body:
            [
              story.trim(),
              fishedOn ? "Дата рыбалки: " + fishedOn : "",
              tackle.trim() ? "Снасти: " + tackle.trim() : "",
              technique.trim() ? "Техника: " + technique.trim() : "",
              lures.trim() ? "Приманки: " + lures.trim() : "",
            ]
              .filter(Boolean)
              .join("\n\n") || null,
          location_name: location.trim() || null,
          weather_summary: weather.trim() || null,
          air_temperature_c: temperature.trim() ? Number(temperature) : null,
          pressure_hpa: pressure.trim() ? Number(pressure) * 1.33322 : null,
          wind_direction: windDirection.trim() || null,
          wind_speed_ms: windSpeed.trim() ? Number(windSpeed) : null,
          is_public: isPublic,
          fishing_method: fishingMethod,
        };
        if (hasCatches) {
          // Report + entered catches + retry receipt commit together under existing RLS.
          // Keep this ID in the local draft if a committed response is lost.
          const { data: committedId, error: commitError } = await supabase
            .rpc("publish_report_with_catches", {
              p_report_id: publicationId.current!,
              p_report: values,
              p_catches: catches
                .filter((c) => c.species.trim())
                .map((c) => ({
                  species: c.species.trim(),
                  weight_kg: c.weight.trim() ? Number(c.weight) : null,
                  length_cm: c.length.trim() ? Number(c.length) : null,
                  technique: technique.trim() || null,
                  lure: lures.trim() || null,
                })),
            })
            .setHeader("Authorization", authorization);
          if (!alive.current) return;
          if (commitError || typeof committedId !== "string")
            throw new Error(
              "Не удалось сохранить отчёт с уловом. Черновик сохранён — попробуй позже.",
            );
          reportId = committedId;
        } else {
          // A no-catch outing still has no dependency on catches or the new RPC.
          const requestId = publicationId.current!;
          let { data: report, error: reportError } = await supabase
            .from("fishing_reports")
            .insert({ ...values, id: requestId, user_id: user.id })
            .setHeader("Authorization", authorization)
            .select("id")
            .single();
          if (reportError || !report?.id) {
            const recovered = await supabase
              .from("fishing_reports")
              .select(
                "id,user_id,title,body,location_name,weather_summary,air_temperature_c,pressure_hpa,wind_direction,wind_speed_ms,is_public,fishing_method",
              )
              .eq("id", requestId)
              .eq("user_id", user.id)
              .single();
            if (
              !recovered.error &&
              recovered.data?.id === requestId &&
              Object.entries(values).every(
                ([field, value]) => recovered.data![field as keyof typeof values] === value,
              )
            ) {
              report = recovered.data;
              reportError = null;
            }
          }
          if (!alive.current) return;
          if (reportError || !report?.id)
            throw reportError || new Error("Не удалось сохранить отчёт. Черновик сохранён.");
          reportId = report.id;
        }
        setSavedReportId(reportId);
      }

      for (const [i, photo] of photos.entries()) {
        if (i < uploadedCount) continue;
        const photoId = photoUploadIds.current.get(photo) ?? crypto.randomUUID();
        photoUploadIds.current.set(photo, photoId);
        setProgress(`Обрабатываем фото ${i + 1} из ${photos.length}…`);
        const prepared = await prepareReportPhoto(photo);
        if (!alive.current) return;
        const body = new FormData();
        body.set("report_id", reportId);
        body.set("photo_id", photoId);
        body.set("sort_order", String(i));
        body.set("file", prepared, "photo.jpg");
        const { data: photoResult, error: uploadError } = await supabase.functions.invoke(
          "report-photo-upload",
          { body, headers: { Authorization: authorization } },
        );
        if (!alive.current) return;
        if (uploadError || photoResult?.photo_id !== photoId) {
          throw new Error("Не удалось обработать фотографию. Повтори загрузку.");
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
          if (!alive.current) return;
          const photoId = savedPhotos.data?.[0]?.id;
          if (photoId && savedFish.data?.length) {
            for (const caught of savedFish.data) {
              if (!alive.current) return;
              const species = catalogFishes.find(
                (x) => x.name.toLowerCase() === caught.species.trim().toLowerCase(),
              );
              if (
                !species ||
                !catalogMappings.some(
                  (x) => x.waterbody_id === selectedWaterbody && x.species_id === species.id,
                )
              )
                continue;
              await supabase.from("atlas_catch_claims").insert({
                user_id: user.id,
                waterbody_id: selectedWaterbody,
                species_id: species.id,
                catch_id: caught.id,
                evidence_photo_id: photoId,
              });
            }
          }
        } catch {
          // Photo, catches and report are already saved; retrying the whole report would duplicate data.
        }
      }
      setProgress("");
      if (!alive.current) return;
      if (draftKey.current) {
        try {
          localStorage.removeItem(draftKey.current);
        } catch {
          // A blocked browser store must not prevent completing the report.
        }
      }
      if (isSpotStaging()) {
        const handoff = createReportHandoff(reportId, catches);
        if (handoff) saveReportHandoff(user.id, handoff);
        else clearReportHandoff(user.id);
      }
      await navigate({ to: "/" });
    } catch (caught) {
      if (!alive.current) return;
      setProgress("");
      const message = caught instanceof Error ? caught.message : "Не удалось опубликовать отчёт.";
      setError(
        savedReportId ? "Отчёт уже сохранён. " + message + " Можно повторить загрузку." : message,
      );
    } finally {
      publishing.current = false;
      if (alive.current) setSaving(false);
    }
  }

  const caught = catches[catchIndex] ?? emptyCatch();
  const fields = {
    location: ["Где рыбачил?", "Водоём или место", location, setLocation],
    date: ["Когда рыбачил?", "Дата рыбалки", fishedOn, setFishedOn],
    tackle: ["На какие снасти ловил?", "Снасти", tackle, setTackle],
    technique: ["Как ловил?", "Техника ловли", technique, setTechnique],
    lures: ["Какие приманки использовал?", "Приманки", lures, setLures],
    weather: ["Какая была погода?", "Погода", weather, setWeather],
    temperature: ["Какая была температура?", "Температура, °C", temperature, setTemperature],
    pressure: ["Какое было давление?", "Давление, мм рт. ст.", pressure, setPressure],
    windDirection: ["Откуда дул ветер?", "Направление ветра", windDirection, setWindDirection],
    windSpeed: ["Какой силы был ветер?", "Ветер, м/с", windSpeed, setWindSpeed],
    weight: [
      "Сколько весила рыба?",
      "Вес, кг",
      caught.weight,
      (value: string) => upd(catchIndex, "weight", value),
    ],
    length: [
      "Какой длины была рыба?",
      "Длина, см",
      caught.length,
      (value: string) => upd(catchIndex, "length", value),
    ],
  } as const;
  const coreIndex = reportSteps.findIndex((question) => question === step);
  const position = coreIndex < 0 ? (editing ? reportSteps.length : 5) : coreIndex + 1;
  const isReview = step === "review";

  function changeStep(next: ReportStep, backward = false) {
    setError("");
    setDraftNotice("");
    setReverse(backward);
    setStep(next);
  }

  function edit(next: ReportStep, index = 0) {
    setCatchIndex(index);
    setEditing(true);
    changeStep(next, true);
  }

  function nextStep(form: HTMLFormElement) {
    if (!form.reportValidity()) return;
    if (step === "title" && !title.trim()) {
      setTitleError("Укажи название отчёта.");
      const field = form.elements.namedItem("reportTitle");
      if (field instanceof HTMLInputElement) field.focus();
      return;
    }
    if (editing) {
      setEditing(false);
      changeStep("review");
      return;
    }
    if (step === "catch" && caught.species.trim()) changeStep("weight");
    else if (step === "weight") changeStep("length");
    else if (step === "length") changeStep("story");
    else if (coreIndex >= 0) changeStep(reportSteps[coreIndex + 1] ?? "review");
  }

  function previousStep() {
    if (editing) {
      setEditing(false);
      changeStep("review");
    } else if (step === "weight") changeStep("catch", true);
    else if (step === "length") changeStep("weight", true);
    else if (step === "story" && caught.species.trim()) changeStep("length", true);
    else if (coreIndex > 0) changeStep(reportSteps[coreIndex - 1]!, true);
  }

  function addCatch() {
    const blank = catches.findIndex((fish) => !fish.species.trim());
    if (blank >= 0) edit("catch", blank);
    else if (catches.length < 20) {
      setCatches((current) => [...current, emptyCatch()]);
      edit("catch", catches.length);
    }
  }

  function saveDraft() {
    try {
      if (!draftKey.current) throw new Error("Draft unavailable");
      localStorage.setItem(draftKey.current, draftPayload);
      setDraftWarning("");
      setError("");
      setDraftNotice("Черновик сохранён на этом устройстве. Фото нужно будет выбрать снова.");
    } catch {
      setError("Не удалось сохранить черновик на этом устройстве. Оставь страницу открытой.");
    }
  }

  function reviewEdit(label: string, value: string, next: ReportStep, index = 0) {
    return (
      <button
        type="button"
        className="z-single-field-edit"
        aria-label={"Изменить: " + label}
        onClick={() => edit(next, index)}
        disabled={saving || Boolean(savedReportId)}
      >
        <span>
          <small>{label}</small>
          <strong>{value || "Не указано"}</strong>
        </span>
        <Pencil size={15} aria-hidden="true" />
      </button>
    );
  }

  let question: string;
  let body: ReactNode;
  let canSkip = false;
  if (step in fields) {
    const field = step as keyof typeof fields;
    const [prompt, label, value, update] = fields[field];
    const numbers = {
      temperature: [-70, 65, 0.1],
      pressure: [500, 900, 0.1],
      windSpeed: [0, 90, 0.1],
      weight: [0, 1000, 0.01],
      length: [0, 1000, 0.1],
    } as const;
    const limits = field in numbers ? numbers[field as keyof typeof numbers] : undefined;
    question = prompt;
    canSkip = !value;
    body = (
      <MobileField
        label={label}
        hint={field === "location" ? "Укажи название без точных координат." : undefined}
      >
        <input
          className="field"
          type={limits ? "number" : field === "date" ? "date" : "text"}
          inputMode={limits ? "decimal" : undefined}
          min={limits?.[0]}
          max={limits?.[1]}
          step={limits?.[2]}
          maxLength={field === "tackle" ? 300 : undefined}
          value={value}
          onChange={(e) => update(e.target.value)}
        />
      </MobileField>
    );
  } else if (step === "title") {
    question = "Как назовём отчёт?";
    body = (
      <MobileField label="Название отчёта *" error={titleError}>
        <input
          className="field"
          name="reportTitle"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError("");
          }}
          maxLength={120}
          required
        />
      </MobileField>
    );
  } else if (step === "discipline") {
    question = "Какой вид рыбалки?";
    body = (
      <MobileField label="Вид рыбалки для достижений *">
        <select
          className="field"
          value={fishingMethod}
          required
          onChange={(e) => setFishingMethod(e.target.value)}
        >
          <option value="" disabled>
            Выбери дисциплину…
          </option>
          {FISHING_DISCIPLINES.map((d) => (
            <option key={d.code} value={d.code}>
              {d.title}
            </option>
          ))}
        </select>
      </MobileField>
    );
  } else if (step === "catch") {
    question = "Что поймал?";
    canSkip = !caught.species.trim();
    body = (
      <MobileField label="Вид рыбы" hint="Если улова не было, пропусти этот вопрос.">
        <input
          className="field"
          list="zapruda-atlas-species"
          value={caught.species}
          onChange={(e) => upd(catchIndex, "species", e.target.value)}
        />
      </MobileField>
    );
  } else if (step === "story") {
    question = "Как прошла рыбалка?";
    canSkip = !story.trim();
    body = (
      <MobileField label="Рассказ">
        <textarea
          className="field z-single-field-story"
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
      </MobileField>
    );
  } else if (step === "atlas") {
    question = "Какой водоём в Атласе?";
    canSkip = !selectedWaterbody;
    body = (
      <MobileField label="Водоём из Атласа" hint="Для ачивки нужны водоём, пойманный вид и фото.">
        <select
          className="field"
          value={selectedWaterbody}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedWaterbody(id);
            const water = catalogWaters.find((w) => w.id === id);
            if (water) setLocation(water.name + (water.region ? " · " + water.region : ""));
          }}
        >
          <option value="">Не выбирать</option>
          {catalogWaters.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.region || w.country_code}
            </option>
          ))}
        </select>
      </MobileField>
    );
  } else if (step === "photos") {
    question = "Добавишь фото?";
    canSkip = photos.length === 0;
    body = (
      <div className="space-y-3">
        <label className="z-single-field-upload">
          <ImagePlus size={19} aria-hidden="true" />
          {photos.length ? "Заменить фотографии" : "Выбрать фотографии"}
          <input
            aria-label="Выбрать фотографии с рыбалки"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => choosePhotos(e.target.files)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          До 6 JPG, PNG или WebP, до 8 МБ каждое. При загрузке удаляются метаданные, включая GPS.
        </p>
        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((src, index) => (
              <div key={src} className="relative h-20 w-24 overflow-hidden rounded-xl">
                <img
                  src={src}
                  alt={`Фото к отчёту ${index + 1}`}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  className="absolute right-0 top-0 grid size-11 place-items-center rounded-lg bg-black/75 text-white"
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Убрать фотографию ${index + 1}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length > 0 && (
          <>
            <button
              className="btn-ghost inline-flex min-h-11 items-center gap-2"
              type="button"
              disabled={aiWorking}
              onClick={() => void identifyFish()}
            >
              <Sparkles size={16} aria-hidden="true" />
              {aiWorking ? "Рассматриваем фото…" : "Подсказать вид рыбы по фото (ИИ)"}
            </button>
            <p className="text-xs text-muted-foreground">
              Фото отправляется ИИ только по нажатию. Ответ можно исправить.
            </p>
            {aiMessage && (
              <p className="text-xs text-primary" role="status">
                {aiMessage}
              </p>
            )}
          </>
        )}
      </div>
    );
  } else {
    question = "Проверь отчёт";
    body = (
      <>
        <article className="z-single-field-review">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            Выезд / Отчёт
          </span>
          <h3 className="text-xl font-black">{title || "Без названия"}</h3>
          {(location || fishedOn) && (
            <p className="text-sm text-muted-foreground">
              {[location, fishedOn].filter(Boolean).join(" · ")}
            </p>
          )}
          {story && <p className="whitespace-pre-wrap text-sm">{story}</p>}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {previews.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`Фото к отчёту ${i + 1}`}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </article>
        {!savedReportId && (
          <>
            <div className="z-single-field-review-edits" aria-label="Изменить ответы">
              {reviewEdit("Место", location, "location")}
              {reviewEdit("Дата", fishedOn, "date")}
              {reviewEdit("Название", title, "title")}
              {reviewEdit(
                "Вид рыбалки",
                FISHING_DISCIPLINES.find((d) => d.code === fishingMethod)?.title ?? "",
                "discipline",
              )}
              {reviewEdit("Рассказ", story, "story")}
              {reviewEdit("Фотографии", photos.length ? String(photos.length) : "", "photos")}
            </div>
            <div className="space-y-2">
              <h3 className="font-bold">Улов</h3>
              {!catches.some((fish) => fish.species.trim()) && (
                <p className="text-sm text-muted-foreground">Рыбалка без улова</p>
              )}
              {catches.map(
                (fish, i) =>
                  fish.species.trim() && (
                    <div key={i} className="z-single-field-review-edits">
                      {reviewEdit("Рыба №" + (i + 1), fish.species, "catch", i)}
                      {reviewEdit(
                        "Вес рыбы №" + (i + 1),
                        fish.weight && fish.weight + " кг",
                        "weight",
                        i,
                      )}
                      {reviewEdit(
                        "Длина рыбы №" + (i + 1),
                        fish.length && fish.length + " см",
                        "length",
                        i,
                      )}
                      <button
                        type="button"
                        className="btn-ghost min-h-11"
                        onClick={() =>
                          setCatches((rows) => {
                            const remaining = rows.filter((_, index) => index !== i);
                            return remaining.length ? remaining : [emptyCatch()];
                          })
                        }
                      >
                        Удалить рыбу №{i + 1}
                      </button>
                    </div>
                  ),
              )}
              <button
                type="button"
                className="btn-ghost min-h-11"
                onClick={addCatch}
                disabled={catches.length >= 20 && catches.every((fish) => fish.species.trim())}
              >
                + Рыба
              </button>
            </div>
            <details className="z-single-field-details">
              <summary>Дополнительные детали</summary>
              <div className="z-single-field-review-edits">
                {additionalSteps.map((extra) => (
                  <div key={extra}>
                    {extra === "atlas"
                      ? reviewEdit(
                          "Водоём из Атласа",
                          catalogWaters.find((water) => water.id === selectedWaterbody)?.name ?? "",
                          "atlas",
                        )
                      : reviewEdit(fields[extra][1], fields[extra][2], extra)}
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Опубликовать в общей ленте
        </label>
        <p className="text-sm text-muted-foreground">
          {isPublic ? "Отчёт будет виден в общей ленте." : "Отчёт останется приватным."}
        </p>
      </>
    );
  }

  return (
    <Shell screen="create">
      <form
        className="z-single-field-flow"
        aria-busy={saving}
        onSubmit={publish}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.repeat) event.preventDefault();
        }}
        onInvalid={(event) => {
          if (event.target instanceof HTMLInputElement && event.target.name === "reportTitle") {
            setTitleError("Укажи название отчёта.");
          }
        }}
      >
        <header className="z-single-field-header">
          <h1>Новый отчёт</h1>
          <SingleFieldProgress step={position} steps={reportSteps} />
        </header>
        <datalist id="zapruda-atlas-species">
          {catalogFishes.map((fish) => (
            <option key={fish.id} value={fish.name} />
          ))}
        </datalist>
        <fieldset disabled={Boolean(savedReportId) || saving} className="min-w-0">
          <SingleFieldStage
            stepKey={`${step}-${catchIndex}`}
            question={question}
            reverse={reverse}
            review={isReview}
          >
            {body}
          </SingleFieldStage>
        </fieldset>
        <StickyFormActions className="z-single-field-actions">
          <button
            type="submit"
            className="z-glass-advance"
            disabled={saving || !draftReady}
            onClick={(event) => {
              if (event.detail > 1) event.preventDefault();
            }}
          >
            {saving
              ? "Сохраняем…"
              : savedReportId
                ? "Повторить загрузку / завершить"
                : isReview
                  ? "Опубликовать отчёт"
                  : editing
                    ? "Готово"
                    : "Далее"}
            {!saving && <ArrowRight size={19} aria-hidden="true" />}
          </button>
          <div className="z-single-field-secondary">
            {(editing || step !== "location") && !savedReportId && (
              <button type="button" onClick={previousStep} disabled={saving}>
                {editing ? "К просмотру" : "Назад"}
              </button>
            )}
            {canSkip && !savedReportId && (
              <button
                type="button"
                onClick={(event) => {
                  if (event.detail <= 1 && event.currentTarget.form)
                    nextStep(event.currentTarget.form);
                }}
              >
                Пропустить
              </button>
            )}
            {isReview && !savedReportId && (
              <button type="button" onClick={saveDraft} disabled={saving}>
                Сохранить черновик
              </button>
            )}
          </div>
        </StickyFormActions>
        <div className="z-single-field-notices">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {draftWarning && <p role="alert">{draftWarning}</p>}
          {draftNotice && <p role="status">{draftNotice}</p>}
          {progress && <p role="status">{progress}</p>}
          {savedReportId && (
            <p role="status">
              Отчёт сохранён. Загружено фото: {uploadedCount} из {photos.length}. Можно повторить
              загрузку.
            </p>
          )}
          {draftRestored && !savedReportId && (
            <>
              <p>Черновик восстановлен на этом устройстве. Фотографии нужно добавить снова.</p>
              <button type="button" className="btn-ghost min-h-11" onClick={clearLocalDraft}>
                Очистить черновик
              </button>
            </>
          )}
          {!savedReportId && (
            <details className="z-single-field-details">
              <summary>Перенос из ZAPRUDA STREET</summary>
              <p>Перенеси завершённую Street-сессию в приватный черновик.</p>
              <button
                type="button"
                className="btn-ghost min-h-11"
                onClick={importStreetSession}
                disabled={!draftReady || saving}
              >
                Перенести Street-сессию
              </button>
            </details>
          )}
        </div>
      </form>
    </Shell>
  );
}
