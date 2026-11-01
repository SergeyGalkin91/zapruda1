import { describe, expect, it, vi } from "vitest";
import { toggleReportReaction } from "./report-reaction-toggle";

describe("report reaction persistence", () => {
  it("adds a reaction when none exists", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const add = vi.fn(async () => ({ error: null }));
    await expect(toggleReportReaction(
      async () => ({ data: [], error: null }), remove, add,
    )).resolves.toBe("added");
    expect(add).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes an existing reaction on a repeat click", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const add = vi.fn(async () => ({ error: null }));
    await expect(toggleReportReaction(
      async () => ({ data: [{ id: "reaction-1" }], error: null }), remove, add,
    )).resolves.toBe("removed");
    expect(remove).toHaveBeenCalledWith(["reaction-1"]);
    expect(add).not.toHaveBeenCalled();
  });

  it("does not mutate when reading existing reactions fails", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const add = vi.fn(async () => ({ error: null }));
    await expect(toggleReportReaction(
      async () => ({ data: null, error: { message: "offline" } }), remove, add,
    )).rejects.toThrow("offline");
    expect(remove).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("propagates failed insert and delete without reporting success", async () => {
    const ok = async () => ({ error: null });
    const fail = async () => ({ error: { message: "permission denied" } });
    await expect(toggleReportReaction(
      async () => ({ data: [], error: null }), ok, fail,
    )).rejects.toThrow("permission denied");
    await expect(toggleReportReaction(
      async () => ({ data: [{ id: "reaction-1" }], error: null }), fail, ok,
    )).rejects.toThrow("permission denied");
  });
});
