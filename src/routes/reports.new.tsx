import { streetStorageKey } from "@/lib/street-storage";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Sparkles } from "lucide-react";
import { MobileField, StickyFormActions } from "@/components/MobileForm";
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

export function NewReport() {
  const navigate = useNavigate();
  const [catches, setCatches] = useState<Catch[]>([{ species: "", weight: "", length: "" }]);
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
  const [step, setStep] = useState(1);
  const stepHeading = useRef<HTMLHeadingElement>(null);
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
              setStep([1, 2, 3].includes(Number(saved["step"])) ? Number(saved["step"]) : 1);
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
              if (Array.isArray(saved["catches"]))
                setCatches(
                  saved["catches"]
                    .filter(
                      (c): c is Catch =>
                        !!c &&
                        typeof c === "object" &&
                        typeof c.species === "string" &&
                        typeof c.weight === "string" &&
                        typeof c.length === "string",
                    )
                    .slice(0, 20),
                );
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
  useEffect(() => {
    if (!draftReady || !draftKey.current || savedReportId) return;
    try {
      localStorage.setItem(
        draftKey.current,
        JSON.stringify({
          publicationId: publicationId.current,
          step,
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
        }),
      );
    } catch {
      setDraftWarning("Автосохранение недоступно. Не закрывай страницу до публикации.");
    }
  }, [
    step,
    fishedOn,
    tackle,
    draftReady,
    savedReportId,
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
  ]);

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
      setStep(1);
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
    setStep(1);
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
    if (saving) return;
    if (step !== 3) {
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
      if (alive.current) setSaving(false);
    }
  }

  function changeStep(next: number) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  function nextStep(form: HTMLFormElement) {
    if (!form.reportValidity()) return;
    if (step === 1 && !title.trim()) {
      setTitleError("Укажи название отчёта.");
      const titleField = form.elements.namedItem("reportTitle");
      if (titleField instanceof HTMLInputElement) titleField.focus();
      return;
    }
    changeStep(Math.min(3, step + 1));
  }
  return (
    <Shell screen="create">
      <form
        className="space-y-6"
        onSubmit={publish}
        onInvalid={(event) => {
          if (event.target instanceof HTMLInputElement && event.target.name === "reportTitle") {
            setTitleError("Укажи название отчёта.");
          }
        }}
      >
        <header>
          <h1 ref={stepHeading} tabIndex={-1} className="mb-4 scroll-mt-24 text-2xl font-bold">
            Новый отчёт
          </h1>
          <ol className="mb-5 grid grid-cols-3 gap-2 text-xs" aria-label="Шаги отчёта">
            {["Где и когда", "Улов и история", "Проверка и публикация"].map((label, i) => (
              <li
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
                className={
                  step === i + 1
                    ? "rounded-xl border border-primary p-3 text-primary"
                    : "rounded-xl border border-white/15 p-3"
                }
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
          <p role="status" className="sr-only">
            Шаг {step} из 3
          </p>
          {draftWarning && <p role="alert">{draftWarning}</p>}
          {!savedReportId && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D7FF35]/30 bg-[#161D13] p-4">
              <div>
                <p className="text-sm font-black text-[#D7FF35]">ZAPRUDA STREET</p>
                <p className="mt-1 text-xs text-zinc-300">
                  Перенести завершённую городскую сессию. Отчёт останется приватным до твоего
                  решения.
                </p>
              </div>
              <button
                type="button"
                onClick={importStreetSession}
                disabled={!draftReady || saving}
                className="min-h-11 rounded-xl border border-[#D7FF35]/60 px-4 py-2 text-xs font-black text-[#D7FF35] disabled:opacity-40"
              >
                Перенести Street-сессию
              </button>
            </div>
          )}
          {savedReportId && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-[#A78BFA]/40 bg-[#A78BFA]/10 p-4 text-sm text-zinc-100"
            >
              <p className="font-bold text-[#D7FF35]">Отчёт сохранён</p>
              <p className="mt-1">
                Загружено фотографий: {uploadedCount} из {photos.length}. Если загрузка прервалась,
                повтори её — второй отчёт не создаётся.
              </p>
            </div>
          )}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 px-4 py-3 text-xs text-zinc-300">
            <span>
              {draftRestored
                ? "Черновик восстановлен на этом устройстве. Фотографии нужно добавить снова."
                : "Текст отчёта автоматически сохраняется на этом устройстве после входа. Фото не сохраняются."}
            </span>
            {draftRestored && !savedReportId && (
              <button
                type="button"
                onClick={clearLocalDraft}
                className="min-h-11 font-bold text-[#D7FF35] hover:underline"
              >
                Очистить черновик
              </button>
            )}
          </div>
        </header>
        <fieldset disabled={Boolean(savedReportId)} className="min-w-0 space-y-6">
          <fieldset
            hidden={step !== 1}
            style={{ display: step === 1 ? undefined : "none" }}
            disabled={step !== 1}
            className="panel grid gap-4 p-5 md:grid-cols-2"
          >
            <MobileField label="Дата рыбалки">
              <input
                className="field"
                type="date"
                value={fishedOn}
                onChange={(e) => setFishedOn(e.target.value)}
              />
            </MobileField>
            <div className="md:col-span-2">
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
            </div>
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
            <MobileField label="Водоём из Атласа (по желанию)">
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
                <option value="">Не выбирать — обычный отчёт</option>
                {catalogWaters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.region || w.country_code}
                  </option>
                ))}
              </select>
            </MobileField>
            <MobileField label="Место (без точных координат)">
              <input
                className="field"
                placeholder="Например, Волга у Нижнего"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </MobileField>
            <p className="md:col-span-2 text-xs leading-5 text-zinc-400">
              Для ачивки выбери водоём, укажи пойманный вид и приложи фото ниже. Заявка отправится
              автоматически после публикации. GPS и отдельные анкеты не нужны.
            </p>
            <MobileField label="Погода">
              <input
                className="field"
                placeholder="Пасмурно, небольшой дождь"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
              />
            </MobileField>
            <MobileField label="Температура, °C">
              <input
                className="field"
                type="number"
                step="0.1"
                placeholder="+12"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </MobileField>
            <MobileField label="Давление, мм рт. ст.">
              <input
                className="field"
                type="number"
                step="0.1"
                placeholder="752"
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
              />
            </MobileField>
            <MobileField label="Направление ветра">
              <input
                className="field"
                placeholder="СЗ"
                value={windDirection}
                onChange={(e) => setWindDirection(e.target.value)}
              />
            </MobileField>
            <MobileField label="Ветер, м/с">
              <input
                className="field"
                type="number"
                min="0"
                step="0.1"
                placeholder="4"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
              />
            </MobileField>
          </fieldset>
          <fieldset
            hidden={step !== 2}
            style={{ display: step === 2 ? undefined : "none" }}
            disabled={step !== 2}
            className="panel grid gap-4 p-5 md:grid-cols-2"
          >
            <MobileField label="Снасти">
              <input
                className="field"
                value={tackle}
                maxLength={300}
                onChange={(e) => setTackle(e.target.value)}
              />
            </MobileField>
            <MobileField label="Техника ловли">
              <input
                className="field"
                placeholder="Джиг, ступенька"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
              />
            </MobileField>
            <MobileField label="Приманки">
              <input
                className="field"
                placeholder="Виброхвост 3”, колебалка 10 г"
                value={lures}
                onChange={(e) => setLures(e.target.value)}
              />
            </MobileField>
            <div className="md:col-span-2">
              <MobileField label="Рассказ">
                <textarea
                  className="field min-h-28"
                  placeholder="Как прошла рыбалка? Где стоял, что пробовал, были ли поклёвки?"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                />
              </MobileField>
            </div>
          </fieldset>
          <fieldset
            hidden={step !== 2}
            style={{ display: step === 2 ? undefined : "none" }}
            disabled={step !== 2}
          >
            <section className="panel min-w-0 space-y-4 p-5 [overflow-wrap:anywhere]">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-lime-300/30 bg-lime-300/10 text-lime-300">
                  <Camera className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Фотографии с рыбалки</h2>
                  <p className="text-xs text-muted-foreground">
                    До 6 фотографий · JPG, PNG, WebP · до 8 МБ каждая
                  </p>
                </div>
              </div>
              <label
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-lime-300/35 bg-lime-300/[0.035] px-4 py-5 text-sm font-semibold text-lime-300 transition hover:bg-lime-300/10 ${savedReportId ? "pointer-events-none opacity-50" : ""}`}
              >
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
                    <div
                      key={src}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10"
                    >
                      <img
                        src={src}
                        alt={`Фото к отчёту ${index + 1}`}
                        className="size-full object-cover"
                      />
                      {!savedReportId && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-lg bg-black/75 p-2 text-white transition hover:bg-black"
                          onClick={() =>
                            setPhotos((current) => current.filter((_, i) => i !== index))
                          }
                          aria-label={`Убрать фотографию ${index + 1}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {photos.length > 0 && (
                <div className="rounded-xl border border-[#D7FF35]/20 bg-[#D7FF35]/5 p-3">
                  <button
                    className="btn-ghost inline-flex items-center gap-2"
                    type="button"
                    disabled={aiWorking}
                    onClick={() => void identifyFish()}
                  >
                    <Sparkles className="size-4 text-[#D7FF35]" />
                    {aiWorking ? "Рассматриваем фото…" : "Подсказать вид рыбы по фото (ИИ)"}
                  </button>
                  <p className="mt-2 text-xs text-zinc-400">
                    Опционально: изображение отправляется ИИ только после твоего нажатия. Результат
                    можно исправить.
                  </p>
                  {aiMessage && (
                    <p className="mt-2 text-xs text-[#D7FF35]" role="status">
                      {aiMessage}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Перед загрузкой удаляются метаданные фотографии, включая GPS. В общей ленте будет
                обработанная копия. Проверь, не раскрывают ли текст и само изображение место
                рыбалки.
              </p>
            </section>

            <section className="panel space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Улов</h2>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setCatches((c) => [...c, { species: "", weight: "", length: "" }])}
                >
                  + Рыба
                </button>
              </div>
              <datalist id="zapruda-atlas-species">
                {catalogFishes.map((f) => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
              {catches.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <MobileField label="Вид рыбы" className="col-span-2 sm:col-span-1">
                    <input
                      className="field"
                      list="zapruda-atlas-species"
                      placeholder="Вид (щука, окунь…)"
                      value={c.species}
                      onChange={(e) => upd(i, "species", e.target.value)}
                    />
                  </MobileField>
                  <MobileField label="Вес, кг">
                    <input
                      className="field"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Вес, кг"
                      value={c.weight}
                      onChange={(e) => upd(i, "weight", e.target.value)}
                    />
                  </MobileField>
                  <MobileField label="Длина, см">
                    <input
                      className="field"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Длина, см"
                      value={c.length}
                      onChange={(e) => upd(i, "length", e.target.value)}
                    />
                  </MobileField>
                  <button
                    type="button"
                    className="btn-ghost col-span-2 min-h-11 justify-self-end sm:col-span-1"
                    aria-label="Удалить"
                    onClick={() => setCatches((x) => x.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </section>
          </fieldset>
          <fieldset
            hidden={step !== 3}
            style={{ display: step === 3 ? undefined : "none" }}
            disabled={step !== 3}
            className="panel min-w-0 space-y-4 p-5 [overflow-wrap:anywhere]"
          >
            <h2 className="text-lg font-bold">Проверь отчёт</h2>
            <h3 className="font-bold">{title}</h3>
            <p>
              {location || "Место не указано"} · {fishedOn || "Дата не указана"}
            </p>
            <p>
              {fishingMethod} · {weather}
            </p>
            <p className="whitespace-pre-wrap">{story}</p>
            <p>
              Снасти: {tackle || "не указаны"} · Приманки: {lures || "не указаны"}
            </p>
            <p>
              {catches
                .filter((c) => c.species.trim())
                .map(
                  (c) =>
                    `${c.species} ${c.weight ? c.weight + " кг" : ""} ${c.length ? c.length + " см" : ""}`,
                )
                .join("; ") || "Рыбалка без улова"}
            </p>
            <p>Фотографий: {photos.length}</p>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Опубликовать в общей ленте
            </label>

            <p className="text-sm text-muted-foreground">
              {isPublic ? "Отчёт будет виден в общей ленте." : "Отчёт останется приватным."} Точные
              координаты не публикуются.
            </p>
          </fieldset>
        </fieldset>
        {error && (
          <p
            className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
        <StickyFormActions>
          {step > 1 && !savedReportId && (
            <button
              type="button"
              className="btn-ghost"
              disabled={saving}
              onClick={() => changeStep(step - 1)}
            >
              Назад
            </button>
          )}
          {step < 3 ? (
            <button
              key="next-step"
              type="button"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                nextStep(e.currentTarget.form!);
              }}
            >
              Далее
            </button>
          ) : (
            <button key="publish-report" type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Сохраняем…"
                : savedReportId
                  ? "Повторить загрузку / завершить"
                  : "Опубликовать отчёт"}
            </button>
          )}
          {progress && (
            <span className="text-xs text-lime-300" role="status">
              {progress}
            </span>
          )}
        </StickyFormActions>
      </form>
    </Shell>
  );
}
