import { describe, it, expect, vi } from "vitest";
import { shuffle } from "../party/index";

describe("shuffle", () => {
  it("returns an array of the same length", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
  });

  it("contains all original elements", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffle(input);
    expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
  });

  it("does not modify the original array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("produces a different order (statistical — run 10 times, at least 1 differs)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let diffCount = 0;
    for (let i = 0; i < 10; i++) {
      const result = shuffle(input);
      if (JSON.stringify(result) !== JSON.stringify(input)) diffCount++;
    }
    expect(diffCount).toBeGreaterThan(0);
  });

  it("uses crypto.getRandomValues (not Math.random)", () => {
    const mathRandomSpy = vi.spyOn(Math, "random");
    const input = [1, 2, 3, 4, 5];
    shuffle(input);
    expect(mathRandomSpy).not.toHaveBeenCalled();
    mathRandomSpy.mockRestore();
  });
});
