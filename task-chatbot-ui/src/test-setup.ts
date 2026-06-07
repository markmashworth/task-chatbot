import '@testing-library/jest-dom';

// Node.js 26 defines globalThis.localStorage as undefined unless --localstorage-file is
// provided. Vitest's jsdom environment doesn't override it in time for component code
// that accesses localStorage at module evaluation. Provide a working in-memory shim.
const _store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null),
  setItem: (key, value) => { _store[key] = String(value); },
  removeItem: (key) => { delete _store[key]; },
  clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
  get length() { return Object.keys(_store).length; },
  key: (index) => Object.keys(_store)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});
