import { describe, expect, it, vi, vitest } from "vitest";
import pRetry from "../src/retry";

describe.only("pRetry", () => {
  it("throws an error when a function is not passed", async () => {
    const fn = "";

    await expect(pRetry(fn)).rejects.toThrow(
      "The first input of pRetry needs to be a function",
    );
  });

  it("throws an error when the options retries attribute retries is not a number", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { retries: "" })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must be a number",
    );
  });

  it("throws an error when the options minTimeout attribute retries is not a number", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { minTimeout: "" })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must be a number",
    );
  });

  it("throws an error when the options factor retries is not a number", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { factor: "" })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must be a number",
    );
  });

  it("throws an error when the options retries attribute retries is not greater than 0", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { retries: -1 })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must not be less than 0",
    );
  });

  it("throws an error when the options minTimeout attribute retries is not greater than 0", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { minTimeout: -1 })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must not be less than 0",
    );
  });

  it("throws an error when the options factor attribute retries is not greater than 0", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn, { factor: -1 })).rejects.toThrow(
      "The options attributes of retries, minTimeout and factor must not be less than 0",
    );
  });

  it("resolves on first success", async () => {
    const fn = vi.fn().mockResolvedValue("done");

    await expect(pRetry(fn)).resolves.toBe("done");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure then succeeds", async () => {
    let calls = 0;

    const fn = () => {
      calls++;

      if (calls < 3) {
        return Promise.reject(new Error("failed"));
      }
      return Promise.resolve("success");
    };

    await expect(pRetry(fn, { retries: 3 })).resolves.toBe("success");
  });

  it("retries on failure and still fails", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("failed"));

    await expect(pRetry(fn)).rejects.toThrow("failed");

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("handles synchronous throws", async () => {
    const fn = () => {
      throw new Error("failed");
    };

    await expect(pRetry(fn, { retries: 1 })).rejects.toThrow("failed");
  });
});
