import { act, type ComponentType, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { fireEvent, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/components/Shell", () => ({
  Shell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({ options }),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { Route } from "../routes/settings";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  localStorage.clear();
  delete document.documentElement.dataset["zaprudaBackground"];
  delete document.documentElement.dataset["zaprudaChat"];
  delete document.documentElement.dataset["zaprudaWallpaper"];
});

it("keeps server-rendered appearance controls inactive until hydration, then preserves the first choice", async () => {
  localStorage.setItem(
    "zapruda.appearance.v1",
    JSON.stringify({ background: "electric-blue", chat: "slate", wallpaper: "carbon" }),
  );
  const Settings = Route.options.component as ComponentType;
  container = document.createElement("div");
  container.innerHTML = renderToString(<Settings />);
  document.body.append(container);
  const theme = container.querySelector('section[aria-labelledby="app-background-title"]')!;
  const wallpaper = container.querySelector('section[aria-labelledby="wallpaper-title"]')!;
  for (const button of [
    ...theme.querySelectorAll("button"),
    ...wallpaper.querySelectorAll("button"),
  ]) {
    expect(button.disabled).toBe(true);
  }
  await act(async () => {
    root = hydrateRoot(container!, <Settings />);
  });
  const blue = within(theme as HTMLElement).getByRole("button", { name: /^Electric Blue/ });
  const carbon = within(wallpaper as HTMLElement).getByRole("button", { name: /^Carbon/ });
  expect(blue).toBeEnabled();
  expect(blue).toHaveAttribute("aria-pressed", "true");
  expect(carbon).toHaveAttribute("aria-pressed", "true");
  const threads = within(wallpaper as HTMLElement).getByRole("button", { name: /^Neon Threads/ });
  await act(async () => {
    fireEvent.click(threads);
  });
  expect(threads).toHaveAttribute("aria-pressed", "true");
  expect(document.documentElement.dataset["zaprudaBackground"]).toBe("electric-blue");
  expect(document.documentElement.dataset["zaprudaWallpaper"]).toBe("neon-threads");
  expect(JSON.parse(localStorage.getItem("zapruda.appearance.v1")!)).toEqual({
    background: "electric-blue",
    chat: "slate",
    wallpaper: "neon-threads",
  });
});

it("distinguishes the Matte Black theme from the identically named wallpaper without changing the other preference", async () => {
  localStorage.setItem(
    "zapruda.appearance.v1",
    JSON.stringify({ background: "electric-blue", chat: "slate", wallpaper: "carbon" }),
  );
  const Settings = Route.options.component as ComponentType;
  container = document.createElement("div");
  container.innerHTML = renderToString(<Settings />);
  document.body.append(container);
  await act(async () => {
    root = hydrateRoot(container!, <Settings />);
  });
  expect(within(container).getAllByRole("button", { name: /^Matte Black/ })).toHaveLength(2);
  const theme = within(container).getByRole("region", { name: "Цветовая тема" });
  const wallpaper = within(container).getByRole("region", { name: "Фон приложения" });
  const matteTheme = within(theme).getByRole("button", { name: /^Matte Black/ });
  const matteWallpaper = within(wallpaper).getByRole("button", { name: /^Matte Black/ });
  await act(async () => {
    fireEvent.click(matteTheme);
  });
  expect(matteTheme).toHaveAttribute("aria-pressed", "true");
  expect(matteWallpaper).toHaveAttribute("aria-pressed", "false");
  expect(document.documentElement.dataset["zaprudaBackground"]).toBe("classic");
  expect(document.documentElement.dataset["zaprudaWallpaper"]).toBe("carbon");
  await act(async () => {
    fireEvent.click(matteWallpaper);
  });
  expect(document.documentElement.dataset["zaprudaWallpaper"]).toBe("matte-black");
  expect(document.documentElement.dataset["zaprudaBackground"]).toBe("classic");
});
