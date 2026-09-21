"use client";

/** Full-page paper grain — the print-like texture that ties both skins together. */
export function Grain() {
  return (
    <div
      aria-hidden
      className="grain-layer pointer-events-none fixed inset-0 z-[105] opacity-[0.05] mix-blend-multiply"
    />
  );
}
