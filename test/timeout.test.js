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

  it("rejects when the promise throws an error", async () => {
    const rejectedPromise = new Promise((_, reject) => {
      reject(new Error("error"));
    });

    await expect(pTimeout(rejectedPromise, 100)).rejects.toThrow("error");
  });

  it("should throw an error when ms passed is not a number", async () => {
    const promise = new Promise((resolve) => {
      resolve("done");
    });

    await expect(() => {
      pTimeout(promise, "100");
    }).toThrow("ms must be a non-negative number");
  });

  it("should throw an error when ms passed is less than 0", async () => {
    const promise = new Promise((resolve) => {
      resolve("done");
    });

    await expect(() => {
      pTimeout(promise, -1);
    }).toThrow("ms must be a non-negative number");
  });
});
