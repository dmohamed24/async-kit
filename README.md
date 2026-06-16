# async-kit

A small utility library that gives you better control over asynchronous JavaScript.

## Summary

`async-kit` provides small, focused helpers for common async patterns:

- Concurrency limiting (`pLimit`)
- Retry with backoff (`pRetry`)
- Promise timeout (`pTimeout`)
- Promise combinators (`pAll`, `pRace`, `pAny`)

These utilities are intentionally tiny and dependency-free so you can copy or adapt them.

## Install

This project uses `vitest` for tests. To install dependencies:

```bash
npm install
```

Run tests with:

```bash
npm test
```

## Usage examples

- `pLimit(concurrency)`

```js
import pLimit from "./src/limit.js";

const limit = pLimit(2);

const tasks = Array.from({ length: 5 }, (_, i) => () => fetch(`/api/${i}`));

await Promise.all(tasks.map((t) => limit(t)));
```

- `pRetry(asyncFunc, options)`

```js
import pRetry from "./src/retry.js";

await pRetry(
  async () => {
    const res = await fetch("/unstable");
    if (!res.ok) throw new Error("fail");
    return res.json();
  },
  { retries: 4, minTimeout: 200, factor: 2 },
);
```

- `pTimeout(promise, ms, message)`

```js
import pTimeout from "./src/timeout.js";

await pTimeout(fetch("/slow"), 1500, "Fetch timed out");
```

- Combinators: `pAll`, `pRace`, `pAny` (accept arrays of promises or functions)

```js
import { pAll, pRace, pAny } from "./src/combinators.js";

// Functions or promises are accepted
await pAll([() => fetch("/a"), () => fetch("/b")]);
```

## API (brief)

- `pLimit(concurrency)` → returns a limiter function `(fn) => Promise` that runs at most `concurrency` tasks in parallel.
- `pRetry(asyncFunc, options)` → runs `asyncFunc` and retries on failure. `options` supports `retries`, `minTimeout`, `factor`.
- `pTimeout(promise, ms, message)` → races a promise against a timeout and rejects with `message` if it takes longer than `ms`.
- `pAll(promiseArr)` → like `Promise.all` but accepts functions (lazy tasks) as inputs.
- `pRace(promiseArr)` → like `Promise.race` but accepts functions as inputs.
- `pAny(promiseArr)` → like `Promise.any` but accepts functions as inputs.

## Concepts used

- Promises and async/await
- Concurrency control and task queues
- Retry strategies and exponential backoff
- Cancellation via timeouts (using `Promise.race`)
- Combinators for composing multiple async tasks
- Minimal, test-driven design (project includes `vitest` tests)

## Lessons learned / Learned while building

- How to implement a concurrency limiter without external deps.
- How to write a simple retry loop with backoff and safe parameter validation.
- Using `Promise.race` to implement timeouts and cleanup with `finally`.
- Accepting functions or promises in combinators to defer execution.
- Writing unit tests for async behaviors and edge cases with `vitest`.

## Running tests

Run:

```bash
npm test
```

## Contributing

Contributions, bug reports and small improvements are welcome. Please open an issue or pull request on the repository.

## License

ISC

# async-kit

A small utility library that gives you better control over asynchronous JavaScript.
