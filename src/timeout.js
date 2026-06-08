c; // src/timeout.js

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
