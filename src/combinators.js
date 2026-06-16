export const pAll = (promiseArr) => {
  const promises = promiseArr.map((promise) => {
    if (typeof promise === "function") {
      return Promise.resolve().then(() => promise());
    } else {
      return promise;
    }
  });
  return Promise.all(promises);
};

export const pRace = (promiseArr) => {
  const promises = promiseArr.map((promise) => {
    if (typeof promise === "function") {
      return Promise.resolve().then(() => promise());
    } else {
      return promise;
    }
  });
  return Promise.race(promises);
};

export const pAny = (promiseArr) => {
  const promises = promiseArr.map((promise) => {
    if (typeof promise === "function") {
      return Promise.resolve().then(() => promise());
    } else {
      return promise;
    }
  });
  return Promise.any(promises);
};
