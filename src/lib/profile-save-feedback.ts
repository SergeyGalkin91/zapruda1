export const PROFILE_SAVE_SUCCESS = "Профиль сохранён. Способы ловли и предпочтения обновлены.";

export function profileSaveNetworkError(profileSaved: boolean, cause: unknown): string {
  const detail = cause instanceof Error ? " " + cause.message : "";
  return profileSaved
    ? "Имя сохранено, но настройки рыбалки не удалось обновить из-за ошибки сети. Повтори сохранение." + detail
    : "Не удалось сохранить профиль из-за ошибки сети. Проверь подключение и повтори попытку." + detail;
}
