import { describe, expect, it } from "vitest";
import { currentRank } from "./progression";
import { methodLevel } from "./disciplines";

describe("community rank boundaries", () => {
  it.each([
    [-1, "Новичок"],
    [0, "Новичок"],
    [99, "Новичок"],
    [100, "Любитель"],
    [6999, "Эксперт ZAPRUDA"],
    [7000, "Легенда ZAPRUDA"],
  ])("shows the earned rank at %s XP", (xp, title) => {
    const result = currentRank(Number(xp));
    expect(result.rank.title).toBe(title);
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
  });

  it.each([
    [-1, "Новичок"],
    [99, "Новичок"],
    [100, "Практик"],
    [3199, "Мастер техники"],
    [3200, "Легенда направления"],
  ])("shows the discipline rank at %s XP", (xp, name) => {
    const result = methodLevel(Number(xp));
    expect(result.current.name).toBe(name);
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
  });
});
