const pLimit = (concurrency) => {
  if (typeof concurrency !== "number") {
    throw new TypeError("Concurrency must be a number");
  }

  if (concurrency < 1) {
    throw new TypeError("Concurrency must be at least 1");
  }

  let activeCount = 0;

  const queue = [];

  const next = (fn) => {
    if (queue.length === 0) {
      return;
    }

    if (activeCount >= concurrency) {
      return;
    }

    const task = queue.shift();

    task();
  };

  const run = async (fn, resolve, reject) => {
    activeCount++;

    try {
      const results = await fn();
      resolve(results);
    } catch (error) {
      reject(error);
    } finally {
      activeCount--;

      next();
    }
  };

  const limit = (fn) => {
    if (typeof fn !== "function") {
      return Promise.reject(new TypeError("Expected a function"));
    }

    return new Promise((resolve, reject) => {
      const task = () => run(fn, resolve, reject);

      if (activeCount < concurrency) {
        task();
      } else {
        queue.push(task);
      }
    });
  };

  return limit;
};

export default pLimit;
