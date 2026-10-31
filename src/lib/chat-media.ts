export const CHAT_PHOTO_LIMIT = 5 * 1024 * 1024;
export const CHAT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function chatPhotoError(file: Pick<File, "type" | "size"> | null): string | null {
  if (!file) return null;
  if (!CHAT_PHOTO_TYPES.some(type => type === file.type) || file.size <= 0 || file.size > CHAT_PHOTO_LIMIT) {
    return "Фото должно быть JPG, PNG или WebP размером от 1 байта до 5 МБ.";
  }
  return null;
}

export function chatPhotoPath(uid: string, messageId: string, type: string, randomId: string): string {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return uid + "/" + messageId + "/" + randomId + "." + ext;
}

/** A retry must attach to the previously created message, never insert a second one. */
export function shouldCreateChatMessage(pendingPhotoMessageId: string | null): boolean {
  return !pendingPhotoMessageId;
}
