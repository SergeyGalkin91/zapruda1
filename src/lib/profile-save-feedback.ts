export const PROFILE_SAVE_SUCCESS = "Профиль сохранён. Способы ловли и предпочтения обновлены.";

export function profileSaveNetworkError(profileSaved: boolean, cause: unknown): string {
  const detail = cause instanceof Error ? " " + cause.message : "";
  return profileSaved
    ? "Имя сохранено, но настройки рыбалки не удалось обновить из-за ошибки сети. Повтори сохранение." + detail
    : "Не удалось сохранить профиль из-за ошибки сети. Проверь подключение и повтори попытку." + detail;
}

export type ProfileSaveResult =
  | { status: "saved" }
  | { status: "profile-error"; message: string }
  | { status: "preferences-error"; message: string }
  | { status: "network-error"; profileSaved: boolean; cause: unknown };

export async function performProfileSave(
  saveProfile: () => Promise<{ error: { message: string } | null }>,
  savePreferences: () => Promise<{ error: { message: string } | null }>,
): Promise<ProfileSaveResult> {
  let profileSaved = false;
  try {
    const profile = await saveProfile();
    if (profile.error) return { status: "profile-error", message: profile.error.message };
    profileSaved = true;
    const preferences = await savePreferences();
    if (preferences.error) return { status: "preferences-error", message: preferences.error.message };
    return { status: "saved" };
  } catch (cause) {
    return { status: "network-error", profileSaved, cause };
  }
}
