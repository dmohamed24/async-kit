const pTimeout = (promise, ms, message) => {
  const errorMessage = message || "Promise timed out error";

  const timeoutPromise = new Promise((_, reject) => {
    const id = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise.then(() => clearTimeout(id));
  });

  return Promise.race([promise, timeoutPromise]);
};

export default pTimeout;
