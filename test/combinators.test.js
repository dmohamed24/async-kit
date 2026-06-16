import { describe, expect, it } from "vitest";
import { pAll, pAny, pRace } from "../src/combinators";

describe("pAll", () => {
  it("should resolve an array of values from promise-returning functions", async () => {
    const promise1 = Promise.resolve("Hello");

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 150);
    });

    const result = await pAll([promise1, promise2]);

    expect(result).toEqual(["Hello", "World"]);
  });

  it("should handle a mix of functions, raw promises, and plain values", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = "NY";

    const result = await pAll([promise1, promise2, promise3]);

    expect(result).toEqual(["Hello", "World", "NY"]);
  });

  it("should reject entirely if one async promise rejects", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = Promise.reject(new Error("Failed"));

    // const result = await pAll([promise1, promise2, promise3]);

    await expect(pAll([promise1, promise2, promise3])).rejects.toThrow(
      "Failed",
    );
  });

  it("should resolve to an empty array when given an empty array", async () => {
    const result = await pAll([]);
    expect(result).toEqual([]);
  });
});

describe("pRace", () => {
  it("should resolve an array of values from promise returning functions", async () => {
    const promise1 = Promise.resolve("Hello");

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 150);
    });

    const result = await pRace([promise1, promise2]);

    expect(result).toEqual("Hello");
  });

  it("should handle a mix of functions, raw promises, and plain values", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = "NY";

    const result = await pRace([promise1, promise2, promise3]);

    expect(result).toEqual("NY");
  });

  it("should reject entirely if async promise rejects first", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = Promise.reject(new Error("Failed"));

    await expect(pRace([promise1, promise2, promise3])).rejects.toThrow(
      "Failed",
    );
  });

  it("should resolve entirely if async promise resolves first", async () => {
    const promise1 = new Promise((_, reject) => {
      setTimeout(() => {
        reject("FAILED");
      }, 550);
    });

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("SUCCESS");
      }, 200);
    });

    await expect(pRace([promise1, promise2])).resolves.toEqual("SUCCESS");
  });
});

describe("pAny", () => {
  it("should resolve an array of values from promise returning functions", async () => {
    const promise1 = Promise.resolve("Hello");

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 150);
    });

    const result = await pAny([promise1, promise2]);

    expect(result).toEqual("Hello");
  });

  it("should handle a mix of functions, raw promises, and plain values", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = "NY";

    const result = await pAny([promise1, promise2, promise3]);

    expect(result).toEqual("NY");
  });

  it("should resolve entirely even if async promise rejects first ", async () => {
    const promise1 = () => {
      return Promise.resolve("Hello");
    };

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("World");
      }, 550);
    });

    const promise3 = Promise.reject(new Error("Failed"));

    const result = await pAny([promise1, promise2, promise3]);

    expect(result).toEqual("Hello");
  });

  it("should resolve entirely when async promise resolves first", async () => {
    const promise1 = new Promise((_, reject) => {
      setTimeout(() => {
        reject("FAILED");
      }, 550);
    });

    const promise2 = new Promise((resolve) => {
      setTimeout(() => {
        resolve("SUCCESS");
      }, 200);
    });

    await expect(pAny([promise1, promise2])).resolves.toEqual("SUCCESS");
  });
});
