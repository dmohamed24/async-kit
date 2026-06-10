import { describe, expect, it } from "vitest";
import pLimit from "../src/limit";

describe("pLimit", () => {
  it("limits concurrency", async () => {
    let running = 0;
    let maxRunning = 0;

    const task = () =>
      new Promise((resolve) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        setTimeout(() => {
          running--;
          resolve();
        }, 10);
      });

    const limit = pLimit(2);
    await Promise.all([limit(task), limit(task), limit(task), limit(task)]);

    expect(maxRunning).toBe(2);
  });

  it("throws when argument is not a number", () => {
    expect(() => pLimit("")).toThrow("Concurrency must be a number");
  });

  it("throws when number is not at least 1", () => {
    expect(() => pLimit(-1)).toThrow("Concurrency must be at least 1");
  });
});
