const pTimeout = (promise, ms, message = "Promise timed out error") => {
  if (typeof ms !== "number" || ms < 0) {
    throw new Error("ms must be a non-negative number");
  }

  let setTimerId;

  const timeoutPromise = new Promise((_, reject) => {
    setTimerId = setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(setTimerId),
  );
};

export default pTimeout;
