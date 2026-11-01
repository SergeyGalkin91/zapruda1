import { describe, expect, it } from "vitest";
import { PROFILE_SAVE_SUCCESS, profileSaveNetworkError, performProfileSave } from "./profile-save-feedback";

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

describe("two-step profile save orchestration", () => {
  it("saves profile then preferences in order", async () => {
    const calls: string[] = [];
    const result = await performProfileSave(
      async () => { calls.push("profile"); return { error: null }; },
      async () => { calls.push("preferences"); return { error: null }; },
    );
    expect(result).toEqual({ status: "saved" });
    expect(calls).toEqual(["profile", "preferences"]);
  });

  it("does not write preferences when profile update fails", async () => {
    let preferencesCalled = false;
    const result = await performProfileSave(
      async () => ({ error: { message: "denied" } }),
      async () => { preferencesCalled = true; return { error: null }; },
    );
    expect(result).toEqual({ status: "profile-error", message: "denied" });
    expect(preferencesCalled).toBe(false);
  });

  it("tracks a partially saved profile after preferences fails", async () => {
    const result = await performProfileSave(
      async () => ({ error: null }),
      async () => ({ error: { message: "preferences rejected" } }),
    );
    expect(result).toEqual({ status: "preferences-error", message: "preferences rejected" });
  });

  it("differentiates a network failure before and after first write", async () => {
    const first = await performProfileSave(
      async () => { throw new Error("offline"); },
      async () => ({ error: null }),
    );
    const second = await performProfileSave(
      async () => ({ error: null }),
      async () => { throw new Error("offline"); },
    );
    expect(first).toMatchObject({ status: "network-error", profileSaved: false });
    expect(second).toMatchObject({ status: "network-error", profileSaved: true });
  });

  it("allows a successful retry after a partial save", async () => {
    let attempt = 0;
    const writeProfile = async () => ({ error: null });
    const writePrefs = async () => {
      attempt++;
      return attempt === 1 ? { error: { message: "offline" } } : { error: null };
    };
    expect((await performProfileSave(writeProfile, writePrefs)).status).toBe("preferences-error");
    expect((await performProfileSave(writeProfile, writePrefs)).status).toBe("saved");
  });
});
