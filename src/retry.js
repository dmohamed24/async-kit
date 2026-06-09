const wait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const pRetry = async (asyncFunc, options = {}) => {
  const { retries = 3, minTimeout = 100, factor = 2 } = options;

  if (typeof asyncFunc !== "function") {
    throw new Error("The first input of pRetry needs to be a function");
  }

  if (
    typeof retries !== "number" ||
    typeof minTimeout !== "number" ||
    typeof factor !== "number"
  ) {
    throw new Error(
      "The options attributes of retries, minTimeout and factor must be a number",
    );
  }

  if (retries < 0 || minTimeout < 0 || factor < 0) {
    throw new Error(
      "The options attributes of retries, minTimeout and factor must not be less than 0",
    );
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await asyncFunc();

      return result;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      const delayTime = minTimeout * factor ** attempt;

      await wait(delayTime);
    }
  }
};

export default pRetry;
