import { describe, expect, it } from "vitest";
import pTimeout from "../src/timeout";

describe("pTimeout", () => {
  it("resolves if promise finishes on time", async () => {
    const fast = new Promise((resolve) => {
      return setTimeout(() => resolve("done"), 100);
    });

    await expect(pTimeout(fast, 500)).resolves.toBe("done");
  });

  it("rejects when the promise does not finish on time and returns default message", async () => {
    const slow = new Promise((resolves) =>
      setTimeout(() => resolves("done"), 100),
    );

    await expect(pTimeout(slow, 50)).rejects.toThrow("Promise timed out error");
  });

  it("rejects when the promise does not finish on time and returns custom message", async () => {
    const slow = new Promise((resolves) =>
      setTimeout(() => resolves("done"), 100),
    );

    await expect(pTimeout(slow, 50, "TIMEOUT ERROR")).rejects.toThrow(
      "TIMEOUT ERROR",
    );
  });
});
