import { describe, expect, it } from "vitest";
import { PROFILE_SAVE_SUCCESS, profileSaveNetworkError } from "./profile-save-feedback";

describe("profile save feedback", () => {
  it("confirms complete success without claiming a partial save", () => {
    expect(PROFILE_SAVE_SUCCESS).toContain("Профиль сохранён");
    expect(PROFILE_SAVE_SUCCESS).toContain("предпочтения обновлены");
  });

  it("reports a first-request network failure as unsaved", () => {
    const feedback = profileSaveNetworkError(false, new Error("offline"));
    expect(feedback).toContain("Не удалось сохранить профиль");
    expect(feedback).toContain("offline");
    expect(feedback).not.toContain("Имя сохранено");
  });

  it("reports a second-request network failure as partially saved", () => {
    const feedback = profileSaveNetworkError(true, new Error("offline"));
    expect(feedback).toContain("Имя сохранено");
    expect(feedback).toContain("Повтори сохранение");
  });

  it("does not leak an unspecified error detail", () => {
    expect(profileSaveNetworkError(false, null)).not.toContain("undefined");
  });
});
