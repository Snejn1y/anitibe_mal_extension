type StorageItem<T> = {
  getValue: () => Promise<T>;
  setValue: (v: T) => Promise<void>;
};

function syncItem<T>(key: string, defaultValue: T): StorageItem<T> {
  return {
    getValue: async () => {
      const r = await browser.storage.sync.get(key);
      return (r[key] ?? defaultValue) as T;
    },
    setValue: async (v) => browser.storage.sync.set({ [key]: v }),
  };
}

function sessionItem<T>(key: string, defaultValue: T): StorageItem<T> {
  return {
    getValue: async () => {
      const r = await browser.storage.local.get(key);
      return (r[key] ?? defaultValue) as T;
    },
    setValue: async (v) => browser.storage.local.set({ [key]: v }),
  };
}

export const malToken = syncItem<string>('malToken', '');
export const malRefresh = syncItem<string>('malRefresh', '');
export const codeVerifier = sessionItem<string>('codeVerifier', '');
// '' = not chosen yet → auto-detect from browser locale.
export const langPref = syncItem<string>('lang', '');
