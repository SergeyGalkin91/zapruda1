import { describe, expect, it } from "vitest";
import { CHAT_PHOTO_LIMIT, chatPhotoError, chatPhotoPath, shouldCreateChatMessage } from "./chat-media";

describe("ZAPRUDA chat media", () => {
  it("accepts supported formats and limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(chatPhotoError({ type, size: CHAT_PHOTO_LIMIT })).toBeNull();
  });
  it("rejects oversized, empty, and unsupported uploads", () => {
    expect(chatPhotoError({ type: "image/jpeg", size: CHAT_PHOTO_LIMIT + 1 })).toBeTruthy();
    expect(chatPhotoError({ type: "image/jpeg", size: 0 })).toBeTruthy();
    expect(chatPhotoError({ type: "image/svg+xml", size: 1024 })).toBeTruthy();
  });
  it("keeps paths under the author and message", () => {
    expect(chatPhotoPath("user-id", "message-id", "image/webp", "random")).toBe("user-id/message-id/random.webp");
    expect(chatPhotoPath("user-id", "message-id", "image/png", "random")).toBe("user-id/message-id/random.png");
  });
  it("never creates a duplicate message when an upload is pending", () => {
    expect(shouldCreateChatMessage("message-id")).toBe(false);
    expect(shouldCreateChatMessage(null)).toBe(true);
  });
});
