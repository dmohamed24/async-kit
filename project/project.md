# Promise Utilities Library — Project Guide

**Level:** Beginner Async | **Time:** 3–4 Days | **Language:** JavaScript (ES2020)

---

## What Is This Project?

You are building a small utility library that gives you better control over asynchronous JavaScript. Think of it as your own cut-down version of battle-tested open-source tools like `p-limit`, `async.js`, and `bluebird`.

The library will let you answer questions like:

- _"Run these 50 API calls, but only 5 at a time."_ → `pLimit`
- _"Try this request up to 3 times if it fails, waiting longer each time."_ → `pRetry`
- _"Cancel this operation if it takes longer than 2 seconds."_ → `pTimeout`
- _"Run these tasks together and collect all results."_ → `pAll / pRace / pAny`

This is one of the best beginner async projects because every feature you build solves a _real_ production problem that professional developers face daily.

---

## Core Concepts You Will Learn

### 1. Promise Internals

A `Promise` is an object representing a value that isn't available yet. It has three states: **pending**, **fulfilled**, or **rejected**. You can only move forward — never back.

```
pending ──► fulfilled
       └──► rejected
```

You create one like this:

```javascript
const p = new Promise((resolve, reject) => {
  // resolve(value) moves it to "fulfilled"
  // reject(reason) moves it to "rejected"
});
```

### 2. The Microtask Queue

JavaScript is single-threaded. When a Promise resolves, its `.then()` callbacks don't run _immediately_ — they are placed in the **microtask queue** and run after the current synchronous code finishes but _before_ the next macrotask (like `setTimeout`).

```
[Call Stack] → empties → [Microtask Queue] drains → [Macrotask Queue] next item
```

This is why you can never get a Promise's value synchronously. Understanding this prevents confusing bugs.

### 3. Concurrency Limiting

Without limits, launching 1,000 Promises at once can crash a server, exhaust memory, or get your IP rate-banned. `pLimit` queues tasks and only runs N of them simultaneously.

### 4. Retry Logic with Backoff

Networks fail. APIs go down. A naive retry loops immediately, hammering the server. **Exponential backoff** means you wait longer on each retry (e.g. 100ms, 200ms, 400ms…), giving the system time to recover.

---

## Folder Structure

```
promise-utils/
├── src/
│   ├── limit.js        ← pLimit: concurrency cap
│   ├── retry.js        ← pRetry: retry with backoff
│   ├── timeout.js      ← pTimeout: cancel if too slow
│   └── queue.js        ← pQueue: priority queue (stretch goal)
├── tests/
│   ├── limit.test.js
│   ├── retry.test.js
│   └── timeout.test.js
├── package.json
└── README.md
```

---

## Step-by-Step Feature Guide

Work through these in order. Each one builds on the mental model of the last.

---

### Step 1 — Project Setup (Day 1, ~1 hour)

**Goal:** Get a plain JavaScript project running with a test runner.

```bash
mkdir promise-utils && cd promise-utils
npm init -y
npm install --save-dev vitest
```

In `package.json`, add:

```json
"scripts": {
  "test": "vitest"
},
"type": "module"
```

The `"type": "module"` line tells Node.js to treat your `.js` files as ES Modules, which means you can use `import`/`export` syntax — the modern standard.

**What to verify:** Create `src/timeout.js` with `export function pTimeout() {}`, then run `npm test`. Vitest should find and run (an empty) test file without errors.

---

### Step 2 — `pTimeout` (Day 1, ~2 hours)

**Start here — it is the simplest.** It teaches you about `Promise.race`, which powers many async patterns.

**What it does:** Wraps any promise. If the promise doesn't resolve within `ms` milliseconds, it rejects with a timeout error instead.

**Key concept:** `Promise.race([a, b])` resolves or rejects as soon as _either_ `a` or `b` settles. By racing your real promise against a timer promise that rejects after N ms, you get a timeout for free.

**File:** `src/timeout.js`

**Inputs:**

- `promise` — the async work you want to time-limit
- `ms` — how many milliseconds before timeout
- `message` — optional custom error message (default: `'Promise timed out'`)

**Output:** A new Promise that either resolves with the original value, or rejects with a timeout error.

**Test to write first:**

```javascript
// tests/timeout.test.js
import { pTimeout } from "../src/timeout.js";

it("resolves if promise finishes in time", async () => {
  const fast = new Promise((r) => setTimeout(() => r("done"), 50));
  await expect(pTimeout(fast, 200)).resolves.toBe("done");
});

it("rejects if promise takes too long", async () => {
  const slow = new Promise((r) => setTimeout(r, 500));
  await expect(pTimeout(slow, 100)).rejects.toThrow("timed out");
});
```

---

### Step 3 — `pRetry` (Day 2, ~3 hours)

**What it does:** Calls an async function. If it throws, waits a bit and tries again, up to a maximum number of attempts. The wait time grows exponentially.

**Key concept:** You are not retrying a Promise — you are retrying a **function that returns a Promise**. This is important: a Promise that has already rejected cannot be "retried". You need to call the factory function again to get a fresh Promise.

**File:** `src/retry.js`

**Inputs:**

- `fn` — a function `() => Promise` (called each attempt)
- `options.retries` — max number of extra attempts (default: `3`)
- `options.minTimeout` — initial wait in ms (default: `100`)
- `options.factor` — multiplier for each wait (default: `2`)

**Output:** A Promise that resolves on the first success, or rejects after all attempts are exhausted.

**The backoff formula:**

```
wait = minTimeout * (factor ** attemptNumber)

Attempt 0 fails → wait 100ms
Attempt 1 fails → wait 200ms
Attempt 2 fails → wait 400ms
Attempt 3 fails → reject with last error
```

**Test to write first:**

```javascript
// tests/retry.test.js
import { pRetry } from "../src/retry.js";

it("resolves on first success", async () => {
  const fn = vi.fn().mockResolvedValue("ok");
  await expect(pRetry(fn, { retries: 3 })).resolves.toBe("ok");
  expect(fn).toHaveBeenCalledTimes(1);
});

it("retries on failure then succeeds", async () => {
  let calls = 0;
  const fn = () => {
    calls++;
    if (calls < 3) return Promise.reject(new Error("fail"));
    return Promise.resolve("success");
  };
  await expect(pRetry(fn, { retries: 3 })).resolves.toBe("success");
});
```

---

### Step 4 — `pLimit` (Day 2–3, ~4 hours)

**This is the core feature and the most educational.** It teaches you about queues and active task tracking.

**What it does:** Returns a "limiter" function. You pass async tasks to the limiter. It ensures at most `concurrency` tasks run at the same time. All other tasks wait in a queue.

**Key concept:** You need to track two things:

1. `activeCount` — how many tasks are currently running
2. `queue` — tasks waiting to run (stored as functions, not Promises)

When a running task finishes, check the queue. If there's something waiting and there's a free slot, start the next one.

**File:** `src/limit.js`

**Usage the caller will use:**

```javascript
const limit = pLimit(3); // only 3 at a time

const results = await Promise.all([
  limit(() => fetchUser(1)),
  limit(() => fetchUser(2)),
  limit(() => fetchUser(3)),
  limit(() => fetchUser(4)), // waits until one of the above finishes
]);
```

**Internal state you need:**

```javascript
let activeCount = 0;
const queue = []; // array of functions, not promises
```

**The scheduling logic (in plain English):**

1. A new task arrives via `limit(fn)`.
2. If `activeCount < concurrency`: start it immediately, increment `activeCount`.
3. Otherwise: wrap it in a function and push it onto `queue`.
4. When any task finishes (in a `.finally()`): decrement `activeCount`, then call `next()`.
5. `next()` checks if `queue.length > 0` and `activeCount < concurrency`. If so, shift one task off the queue and start it.

**Test to write first:**

```javascript
// tests/limit.test.js
import { pLimit } from "../src/limit.js";

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
      }, 50);
    });

  const limit = pLimit(2);
  await Promise.all([limit(task), limit(task), limit(task), limit(task)]);

  expect(maxRunning).toBe(2); // never exceeded 2
});
```

---

### Step 5 — `pAll`, `pRace`, `pAny` (Day 3, ~2 hours)

These are wrappers around the built-in `Promise.all`, `Promise.race`, and `Promise.any`, but your versions will accept **either an array of Promises or an array of functions**. This is consistent with the rest of your library's API and teaches you about normalising inputs.

**File:** Create `src/combinators.js`

**Cheat sheet of what each does:**

| Function | Resolves when                      | Rejects when        |
| -------- | ---------------------------------- | ------------------- |
| `pAll`   | ALL promises resolve               | ANY promise rejects |
| `pRace`  | FIRST promise settles (either way) | same                |
| `pAny`   | FIRST promise resolves             | ALL promises reject |

**Each one is short.** The learning here is in the input normalisation:

```javascript
// Normalise: accept either a function or a promise directly
const promises = tasks.map((t) => (typeof t === "function" ? t() : t));
// Then delegate to the native method
return Promise.all(promises);
```

---

### Step 6 — Stretch Goals (Day 4)

Only attempt these after the core features are solid and tested.

#### Cancelable Promises

JavaScript Promises cannot be cancelled natively. The modern solution is `AbortController`. You pass an `AbortSignal` into your task, and the task checks it.

**What to research:** `AbortController`, `AbortSignal`, and how `fetch` accepts a signal.

#### `pQueue` with Priority

Extend your `pLimit` queue so that tasks can be given a `priority` number. Higher priority tasks jump the queue. The internal `queue` array becomes sorted by priority on each insert.

**What to research:** Priority queues, min-heaps, and `Array.sort()`.

#### Structured Concurrency

The idea that async tasks should be scoped to a lifetime — if a parent task is cancelled or errors, all its children are too. This is a more advanced pattern used in languages like Swift and Kotlin, and is being explored in JavaScript.

**What to research:** TC39 structured concurrency proposal, `AsyncContext`.

---

## Code Example With Annotations

Below is a complete, annotated implementation of `pTimeout` in plain JavaScript. Read every comment — they explain not just _what_ the code does but _why_ it is written that way.

```javascript
// src/timeout.js

// ─── Custom Error Class ───────────────────────────────────────────────────────
//
// We create a custom error so callers can check: if (err instanceof TimeoutError)
// and handle timeouts differently from other failures.
// Without this, all errors look the same and the caller can't tell why it failed.

export class TimeoutError extends Error {
  constructor(message = "Promise timed out") {
    // Always call super() first in a class that extends another class.
    // This runs the Error constructor, which sets up the stack trace.
    super(message);

    // In some environments, extending built-in classes like Error can lose
    // the correct prototype chain. This line manually fixes it so that
    // `err instanceof TimeoutError` works reliably everywhere.
    Object.setPrototypeOf(this, new.target.prototype);

    // Give the error a recognisable name in stack traces instead of "Error".
    this.name = "TimeoutError";
  }
}

// ─── Helper: sleep ────────────────────────────────────────────────────────────
//
// A tiny utility that returns a Promise which resolves after `ms` milliseconds.
// We'll use this pattern inside pRetry too, so it's worth understanding well.
// setTimeout doesn't return a Promise natively — this wrapper makes it async-friendly.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Function ────────────────────────────────────────────────────────────
//
// pTimeout(promise, ms, message?)
//
// Parameters:
//   promise  - The async work we want to time-limit
//   ms       - Milliseconds before we give up
//   message  - Optional custom error message

export function pTimeout(promise, ms, message) {
  // We build a "timer promise" — one that always rejects after `ms`
  // milliseconds. By itself it's useless, but combined with Promise.race
  // it becomes our timeout mechanism.
  const timeoutPromise = new Promise((_, reject) => {
    // setTimeout schedules a callback for later. It returns a numeric ID
    // that we can use to cancel it with clearTimeout().
    const id = setTimeout(() => {
      // When the timer fires, reject the timeout promise.
      // This will cause Promise.race below to settle with this rejection.
      reject(new TimeoutError(message));
    }, ms);

    // IMPORTANT: Memory leak prevention.
    // If the original promise resolves BEFORE the timeout fires, we don't
    // need the timer anymore. Calling clearTimeout(id) cancels it so Node.js
    // doesn't keep the event loop alive pointlessly.
    //
    // We pass a no-op () => {} as the rejection handler so that if `promise`
    // rejects, we don't get an "unhandled rejection" warning from this .then().
    // We're not ignoring the error — it will still propagate through Promise.race.
    promise.then(
      () => clearTimeout(id),
      () => clearTimeout(id),
    );
  });

  // Promise.race([a, b]) returns a new promise that settles as soon as
  // either `a` or `b` settles — with that same value or rejection.
  //
  // So: if `promise` resolves first  → we get its value ✓
  //     if `timeoutPromise` fires first → we get TimeoutError ✓
  return Promise.race([promise, timeoutPromise]);
}
```

---

## Common Mistakes to Avoid

**1. Retrying a Promise instead of a function**

```javascript
// ❌ WRONG — the promise is already running (or settled), retrying does nothing
const result = await pRetry(somePromise, { retries: 3 });

// ✅ CORRECT — pass a function so pRetry can call it again each attempt
const result = await pRetry(() => fetchData(), { retries: 3 });
```

**2. Forgetting to handle the queue when a task finishes**
In `pLimit`, if you forget to call `next()` in `.finally()`, tasks will pile up in the queue forever and never run.

**3. Swallowing errors in retry logic**
Always re-throw the _last_ error after all retries are exhausted, not a generic message. The caller needs to know what actually went wrong.

**4. Not clearing timers**
In `pTimeout`, not calling `clearTimeout` on success is a resource leak that can keep your Node process alive when it should have exited.

**5. Forgetting `"type": "module"` in package.json**
Without this, Node.js treats your files as CommonJS and `import`/`export` syntax will throw a syntax error. If you'd rather use `require()` instead, you can skip this — but `import`/`export` is the modern standard worth learning.

---

## Recommended Learning Order

1. Read MDN's [Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) guide
2. Watch Jake Archibald's [In The Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0) talk (covers microtask queue visually)
3. Read the source of [p-limit](https://github.com/sindresorhus/p-limit) on GitHub _after_ you've written your own — comparing your approach to a production library is one of the best learning tools there is
4. Read [p-retry](https://github.com/sindresorhus/p-retry) source for the same reason

---

## Daily Plan

| Day | Tasks                                                    |
| --- | -------------------------------------------------------- |
| 1   | Setup, write all tests first (TDD), implement `pTimeout` |
| 2   | Implement `pRetry` with backoff, verify tests pass       |
| 3   | Implement `pLimit`, implement `pAll`/`pRace`/`pAny`      |
| 4   | Stretch goals, clean up, write your README               |

**Tip:** Write the test first, watch it fail, then write the implementation until it passes. This is Test-Driven Development (TDD) and it will train you to think clearly about what a function is supposed to _do_ before you worry about _how_ to do it.
