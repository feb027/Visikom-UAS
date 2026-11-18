import type { KeyboardEvent } from "react";

export function handleRovingTabKeyDown<T>(
  e: KeyboardEvent<HTMLButtonElement>,
  items: readonly T[],
  currentIndex: number,
  onSelect: (item: T) => void
): void {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") {
    return;
  }
  e.preventDefault();
  let nextIdx = currentIndex;
  if (e.key === "ArrowRight") nextIdx = (currentIndex + 1) % items.length;
  if (e.key === "ArrowLeft") nextIdx = (currentIndex - 1 + items.length) % items.length;
  if (e.key === "Home") nextIdx = 0;
  if (e.key === "End") nextIdx = items.length - 1;
  onSelect(items[nextIdx]);
}
