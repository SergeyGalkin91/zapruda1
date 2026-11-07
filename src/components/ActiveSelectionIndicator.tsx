import { useLayoutEffect, useRef } from "react";
import { LiquidDropArtwork } from "./LiquidDropArtwork";

const selected =
  '[aria-current="page"],[aria-pressed="true"],[aria-selected="true"],[data-selection-active="true"]';
const choices = "a, button, label";
const previousRoute = new Map<string, string>();

/** One non-interactive moving layer per single-choice group. */
export function ActiveSelectionIndicator({ routeGroup }: { routeGroup?: string }) {
  const overlay = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const frame = layer.current;
    const group = overlay.current?.parentElement;
    if (!frame || !group) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let active: Element | undefined;
    let animation: Animation | undefined;
    let initialKey = routeGroup ? previousRoute.get(routeGroup) : undefined;
    let box: number[] | undefined;
    let observed = new Set<Element>();
    const key = (item: Element) =>
      item.getAttribute("href") ?? item.getAttribute("data-selection-key");

    const sync = () => {
      const items = Array.from(group.children).filter((item) => item.matches(choices));
      for (const item of observed) if (!items.includes(item)) resize?.unobserve(item);
      for (const item of items) if (!observed.has(item)) resize?.observe(item);
      observed = new Set(items);

      const target = items.find((item) => item.matches(selected));
      const rect = target?.getBoundingClientRect();
      if (!target || target.hasAttribute("data-selection-plain") || !rect?.width || !rect.height) {
        animation?.cancel();
        frame.hidden = true;
        active = target;
        box = undefined;
        if (routeGroup && target && rect?.width) previousRoute.delete(routeGroup);
        return;
      }

      const parent = overlay.current!.getBoundingClientRect();
      const geometry = [rect.left - parent.left, rect.top - parent.top, rect.width, rect.height];
      const changed = target !== active;
      if (!changed && box?.every((value, index) => value === geometry[index])) return;
      const origin =
        changed && !frame.hidden
          ? frame.getBoundingClientRect()
          : initialKey && items.find((item) => key(item) === initialKey)?.getBoundingClientRect();
      initialKey = undefined;
      animation?.cancel();
      active = target;
      box = geometry;
      const targetKey = key(target);
      if (routeGroup && targetKey) previousRoute.set(routeGroup, targetKey);
      frame.hidden = false;
      frame.style.left = geometry[0] + "px";
      frame.style.top = geometry[1] + "px";
      frame.style.width = rect.width + "px";
      frame.style.height = rect.height + "px";
      if (
        !changed ||
        !origin ||
        (origin.left === rect.left && origin.top === rect.top) ||
        motion?.matches ||
        document.documentElement.dataset["zaprudaLiquidMotion"] === "off"
      )
        return;

      const x = origin.left + origin.width / 2 - rect.left - rect.width / 2;
      const y = origin.top + origin.height / 2 - rect.top - rect.height / 2;
      const axis = Math.abs(x) >= Math.abs(y) ? "scaleX" : "scaleY";
      animation = frame.animate?.(
        [
          {
            transform: `translate(${x}px,${y}px) scale(${origin.width / rect.width},${origin.height / rect.height})`,
          },
          { transform: `translate(${x * 0.45}px,${y * 0.45}px) ${axis}(1.15)`, offset: 0.48 },
          { transform: "none" },
        ],
        { duration: 360, easing: "cubic-bezier(.22,.7,.25,1)" },
      );
    };

    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(sync);
    const attributes = new MutationObserver(sync);
    attributes.observe(group, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-current", "aria-selected", "aria-pressed", "data-selection-active"],
    });
    resize?.observe(group);
    sync();
    return () => {
      attributes.disconnect();
      resize?.disconnect();
      animation?.cancel();
    };
  }, [routeGroup]);

  return (
    <span ref={overlay} className="z-active-selection" aria-hidden="true">
      <span ref={layer} className="z-liquid-indicator" hidden>
        <LiquidDropArtwork />
      </span>
    </span>
  );
}

/** Independent choices can coexist, for example several fishing disciplines in a profile. */
export function ActiveSelectionMark({ selected }: { selected: boolean }) {
  return selected ? (
    <span className="z-active-selection-mark" aria-hidden="true">
      <LiquidDropArtwork />
    </span>
  ) : null;
}
