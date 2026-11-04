/** Decode into fresh pixels so source metadata/filename never leave this client. */
export async function prepareReportPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("Не удалось прочитать фотографию.");
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось подготовить фотографию.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.type !== "image/jpeg" || blob.size > 5 * 1024 * 1024) {
            reject(new Error("Не удалось подготовить JPG до 5 МБ. Выбери другое фото."));
          } else resolve(blob);
        },
        "image/jpeg",
        0.86,
      );
    });
  } finally {
    bitmap.close();
  }
}
