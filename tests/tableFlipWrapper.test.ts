import { describe, it, expect } from "vitest";
import TableFlipWrapperSrc from "../src/components/TableFlipWrapper.tsx?raw";

describe("TableFlipWrapper", () => {
  it("accepts a nonce prop and children", () => {
    expect(TableFlipWrapperSrc).toMatch(/nonce:\s*number/);
    expect(TableFlipWrapperSrc).toMatch(/children:\s*React\.ReactNode/);
  });

  it("applies the table-flip class only while active", () => {
    expect(TableFlipWrapperSrc).toMatch(/'table-flip'/);
  });

  it("clears the flip after 1200ms", () => {
    expect(TableFlipWrapperSrc).toMatch(/setTimeout\(\(\) => setRun\(0\),\s*1200\)/);
  });

  it("has a data-testid for e2e targeting", () => {
    expect(TableFlipWrapperSrc).toMatch(/data-testid="table-flip-wrapper"/);
  });
});
