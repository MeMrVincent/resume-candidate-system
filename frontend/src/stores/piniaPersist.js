const piniaPersistConfig = (key, paths) => {
  const persist = {
    key,
    storage: localStorage,
    paths,
  };
  return persist;
};

export default piniaPersistConfig;
