// ============================================================================
// ALMACENAMIENTO: IndexedDB (principal, sin límite práctico) con respaldo
// automático en localStorage (espejo de arranque rápido / fallback).
// ============================================================================
const Storage = (() => {
  const DB_NAME = "pos_sistema_db";
  const DB_VERSION = 1;
  const STORE_DATA = "datos";      // claves: "db" -> objeto DB completo
  const STORE_BK = "respaldos";    // claves: id de respaldo -> snapshot

  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    if (!window.indexedDB) return Promise.reject(new Error("IndexedDB no disponible"));
    dbPromise = new Promise((resolve, reject) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DATA)) db.createObjectStore(STORE_DATA);
        if (!db.objectStoreNames.contains(STORE_BK)) db.createObjectStore(STORE_BK);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Error abriendo IndexedDB"));
      req.onblocked = () => console.warn("IndexedDB abierta en otra pestaña; espere...");
    });
    return dbPromise;
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Ejecuta una operación dentro de una transacción y resuelve con su resultado.
  function idb(storeName, mode, op) {
    return open().then(db => new Promise((resolve, reject) => {
      let tx = null;
      try { tx = db.transaction(storeName, mode); } catch (e) { reject(e); return; }
      const store = tx.objectStore(storeName);
      let settled = false;
      try {
        Promise.resolve(op(store))
          .then(v => { settled = true; resolve(v); })
          .catch(e => { settled = true; reject(e); });
      } catch (e) { settled = true; reject(e); }
      tx.onerror = () => { if (!settled) reject(tx.error); };
      tx.onabort = () => { if (!settled) reject(tx.error || new Error("Transacción abortada")); };
    }));
  }

  function save(key, value, storeName) {
    const snap = JSON.parse(JSON.stringify(value));
    return idb(storeName || STORE_DATA, "readwrite", store =>
      reqToPromise(store.put(snap, key)).then(() => true)
    ).catch(e => { console.error("Error guardando en IndexedDB:", e); return false; });
  }

  function load(key, storeName) {
    return idb(storeName || STORE_DATA, "readonly", store =>
      reqToPromise(store.get(key))
    ).catch(e => { console.error("Error leyendo de IndexedDB:", e); return null; });
  }

  function remove(key, storeName) {
    return idb(storeName || STORE_DATA, "readwrite", store =>
      reqToPromise(store.delete(key)).then(() => true)
    ).catch(() => false);
  }

  // Migra respaldos guardados antes en localStorage hacia IndexedDB (una sola vez).
  function migrateLegacyBackups(prefix) {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) keys.push(k);
    }
    if (!keys.length) return Promise.resolve(0);
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BK, "readwrite");
      const store = tx.objectStore(STORE_BK);
      let count = 0;
      keys.forEach(k => {
        try {
          const snap = JSON.parse(window.localStorage.getItem(k));
          store.put(snap, k.replace(prefix, ""));
          window.localStorage.removeItem(k);
          count++;
        } catch (e) { console.warn("Respaldo heredado no migrado:", k, e); }
      });
      tx.oncomplete = () => resolve(count);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("Transacción abortada"));
    }));
  }

  return {
    isSupported: () => !!window.indexedDB,
    save,
    load,
    remove,
    saveBackup: (id, snap) => save(id, snap, STORE_BK),
    getBackup: id => load(id, STORE_BK),
    removeBackup: id => remove(id, STORE_BK),
    migrateLegacyBackups
  };
})();
