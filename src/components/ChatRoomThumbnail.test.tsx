import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatRoomThumbnail } from "./ChatRoomThumbnail";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("decorative chat room photo fallback", () => {
  it("keeps the existing room icon visible while loading and shows a loaded photo", () => {
    const { container } = render(<ChatRoomThumbnail src="/room.jpg" fallback="🏆" />);
    expect(screen.getByText("🏆")).toBeInTheDocument();
    fireEvent.load(container.querySelector("img")!);
    expect(screen.queryByText("🏆")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(container.querySelector("img")).toBeInTheDocument();
  });

  it("releases a stalled decorative request after five seconds", () => {
    const { container } = render(<ChatRoomThumbnail src="/never-finishes.jpg" fallback="🏆" />);
    act(() => vi.advanceTimersByTime(4999));
    expect(container.querySelector("img")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("uses the same fallback immediately on a failed image", () => {
    const { container } = render(<ChatRoomThumbnail src="/missing.jpg" fallback="🏆" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("starts a fresh request lifecycle when the URL changes", () => {
    const { container, rerender } = render(<ChatRoomThumbnail src="/first.jpg" fallback="🏆" />);
    act(() => vi.advanceTimersByTime(4000));
    rerender(<ChatRoomThumbnail src="/second.jpg" fallback="🎣" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("img")).toHaveAttribute("src", "/second.jpg");
    act(() => vi.advanceTimersByTime(4000));
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("🎣")).toBeInTheDocument();
  });

  it("cleans up a pending timeout when its room leaves the list", () => {
    const { unmount } = render(<ChatRoomThumbnail src="/room.jpg" fallback="🏆" />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
