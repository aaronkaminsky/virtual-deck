import { describe, it, expect } from "vitest";
import SpreadZoneSrc from "../src/components/SpreadZone.tsx?raw";

describe("SpreadZone Tableau label", () => {
  it("defines showTableauLabel as isReallyEmpty gated on interactive !== false", () => {
    expect(SpreadZoneSrc).toMatch(/const showTableauLabel = isReallyEmpty && interactive !== false;/);
  });

  it("renders the Tableau label only when showTableauLabel is true and not hovering", () => {
    expect(SpreadZoneSrc).toMatch(/\{showTableauLabel && !isOver && \(/);
    expect(SpreadZoneSrc).toMatch(/>Tableau<\/span>/);
  });

  it("grows the collapsed bar to h-5 with centered text when the label shows, keeps h-4 otherwise", () => {
    expect(SpreadZoneSrc).toMatch(/showTableauLabel\s*\n?\s*\?\s*'h-5 border border-dashed border-muted-foreground\/30 rounded-md flex items-center justify-center'\s*\n?\s*:\s*'h-4 border border-dashed border-muted-foreground\/30 rounded-md'/);
  });

  it("does not change the drag-hover (isOver) collapsed styling", () => {
    expect(SpreadZoneSrc).toMatch(/'min-w-\[56px\] sm:min-w-\[80px\] h-\[40px\] sm:h-\[56px\] border border-dashed border-primary rounded-lg flex items-center px-2 py-2'/);
  });
});
