import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const SUPABASE_URL = "https://ulhnkrtbswolpywesbgx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TbdpsU_kyvXHuc9bo2R-bQ_QjFoFaW7";

const DB_NAME = "biz-fox-erp-offline";
const DB_VERSION = 1;
const nativeFetch = window.fetch.bind(window);

function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("responses")) db.createObjectStore("responses", { keyPath: "key" });
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function dbAction(storeName, mode, action) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = action(store);
    tx.oncomplete = () => { db.close(); resolve(result?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function jwtSubject(headers) {
  const token = headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  try {
    const part = token?.split(".")[1];
    return part ? JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))).sub || "guest" : "guest";
  } catch { return "guest"; }
}
const responseKey = (url, headers) => jwtSubject(headers) + ":" + url;
async function cachedResponse(key) {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("responses", "readonly").objectStore("responses").get(key);
    request.onsuccess = () => { const item = request.result; db.close(); resolve(item || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
async function storeResponse(key, response) {
  const item = { key, body: await response.clone().text(), status: response.status, statusText: response.statusText, headers: [...response.headers.entries()], savedAt: Date.now() };
  await dbAction("responses", "readwrite", store => store.put(item));
}
async function mergePendingRows(url, cachedBody) {
  let parsed;
  try { parsed = JSON.parse(cachedBody); } catch { return cachedBody; }
  if (!Array.isArray(parsed)) return cachedBody;
  const table = new URL(url).pathname.split("/").pop();
  const items = await outboxItems().catch(() => []);
  for (const item of items) {
    const pendingUrl = new URL(item.url);
    if (pendingUrl.pathname.split("/").pop() !== table) continue;
    const filters = new URL(url).searchParams;
    const idFilter = filters.get("id");
    if (item.method === "POST") {
      try {
        const body = JSON.parse(item.body);
        const rows = Array.isArray(body) ? body : [body];
        rows.forEach(row => {
          if (row && !parsed.some(existing => existing.id && existing.id === row.id)) {
            if (!row.created_at) row.created_at = new Date(item.createdAt).toISOString();
            parsed.push(row);
          }
        });
      } catch {}
    } else if (pendingUrl.searchParams.get("id")?.startsWith("eq.")) {
      const id = pendingUrl.searchParams.get("id").slice(3);
      const index = parsed.findIndex(row => row.id === id);
      if (item.method === "PATCH" && index >= 0) {
        try { Object.assign(parsed[index], JSON.parse(item.body)); } catch {}
      } else if (item.method === "DELETE" && index >= 0) parsed.splice(index, 1);
    }
  }
  return JSON.stringify(parsed);
}
async function outboxItems() {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("outbox", "readonly").objectStore("outbox").getAll();
    request.onsuccess = () => { db.close(); resolve((request.result || []).sort((a,b)=>a.createdAt-b.createdAt)); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
async function setOfflineState() {
  let count = 0;
  try { count = (await outboxItems()).length; } catch {}
  window.BizFoxOfflineState = { online: navigator.onLine, pending: count };
  window.dispatchEvent(new CustomEvent("bizfox:syncstate", { detail: window.BizFoxOfflineState }));
}
async function queueRequest(url, method, headers, body) {
  const parsed = JSON.parse(body || "null");
  let queuedBody = body || "";
  let localRecord = null;
  if (method === "POST" && parsed && typeof parsed === "object") {
    const addId = row => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        if (!row.id) row.id = crypto.randomUUID();
        if (!row.created_at) row.created_at = new Date().toISOString();
        if (!row.updated_at) row.updated_at = row.created_at;
        return row;
      }
      return row;
    };
    const prepared = Array.isArray(parsed) ? parsed.map(addId) : addId(parsed);
    queuedBody = JSON.stringify(prepared);
    localRecord = Array.isArray(prepared) ? prepared[0] : prepared;
  }
  const id = crypto.randomUUID();
  await dbAction("outbox", "readwrite", store => store.put({
    id, url, method, headers: [...headers.entries()], body: queuedBody, createdAt: Date.now(), attempts: 0
  }));
  await setOfflineState();
  return localRecord;
}
let syncRunning = false;
async function syncOutbox() {
  if (!navigator.onLine || syncRunning) return;
  syncRunning = true;
  let syncedCount = 0;
  try {
    const items = await outboxItems();
    for (const item of items) {
      const headers = new Headers(item.headers);
      try {
        const sessionResult = await supabase.auth.getSession();
        if (sessionResult.data?.session?.access_token) headers.set("Authorization", "Bearer " + sessionResult.data.session.access_token);
        const response = await nativeFetch(item.url, { method: item.method, headers, body: item.body || undefined });
        if (response.ok || response.status === 409) {
          await dbAction("outbox", "readwrite", store => store.delete(item.id));
          await dbAction("responses", "readwrite", store => store.clear());
          syncedCount++;
          continue;
        }
        const message = await response.clone().text();
        await dbAction("outbox", "readwrite", store => store.put({ ...item, attempts: (item.attempts || 0) + 1, lastError: message.slice(0, 500) }));
        break;
      } catch (error) {
        await dbAction("outbox", "readwrite", store => store.put({ ...item, attempts: (item.attempts || 0) + 1, lastError: String(error).slice(0, 500) }));
        break;
      }
    }
  } catch (error) { console.warn("Offline sync is waiting", error); }
  finally {
    syncRunning = false;
    await setOfflineState();
    const state = window.BizFoxOfflineState;
    if (state.online && state.pending === 0 && syncedCount > 0) {
      window.dispatchEvent(new CustomEvent("bizfox:synccomplete", { detail: { synced: syncedCount } }));
    }
  }
}
window.BizFoxOffline = {
  syncNow: syncOutbox,
  async getStatus() { await setOfflineState(); return window.BizFoxOfflineState; },
  async enableNotifications() {
    if (window.BizFoxAndroid?.requestNotifications) { window.BizFoxAndroid.requestNotifications(); return true; }
    if (!("Notification" in window)) return false;
    return (await Notification.requestPermission()) === "granted";
  },
  notify(title, body) {
    if (window.BizFoxAndroid?.showNotification) { window.BizFoxAndroid.showNotification(title, body); return; }
    if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body, icon: "./assets/icon.svg" });
  }
};
window.addEventListener("online", syncOutbox);
window.addEventListener("online", setOfflineState);
window.addEventListener("offline", setOfflineState);
window.addEventListener("load", () => { setOfflineState(); if (navigator.onLine) syncOutbox(); });
window.setInterval?.(() => { if (navigator.onLine) syncOutbox(); }, 60000);

window.fetch = async (input, init = {}) => {
  const requestUrl = typeof input === "string" ? input : input.url;
  const method = String(init.method || (typeof input === "string" ? "GET" : input.method) || "GET").toUpperCase();
  const url = new URL(requestUrl, location.href);
  const isDatabaseApi = url.origin === SUPABASE_URL && url.pathname.startsWith("/rest/v1/");
  if (!isDatabaseApi) return nativeFetch(input, init);
  const headers = new Headers(init.headers || (typeof input === "string" ? undefined : input.headers));
  const key = responseKey(url.href, headers);

  if (method === "GET") {
    try {
      const response = await nativeFetch(input, init);
      if (response.ok) { try { await storeResponse(key, response); } catch (error) { console.warn("Offline cache write failed", error); } }
      return response;
    } catch (error) {
      const cached = await cachedResponse(key).catch(() => null);
      if (cached) {
        const body = await mergePendingRows(url.href, cached.body).catch(() => cached.body);
        return new Response(body, { status: cached.status, statusText: cached.statusText, headers: cached.headers });
      }
      throw error;
    }
  }

  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    try { return await nativeFetch(input, init); }
    catch (error) {
      const body = init.body;
      if (typeof body !== "string" || !url.pathname.startsWith("/rest/v1/")) throw error;
      const localRecord = await queueRequest(url.href, method, headers, body);
      const wantsRepresentation = (headers.get("Prefer") || "").includes("return=representation");
      if (wantsRepresentation && method === "POST" && localRecord) {
        const accept = headers.get("Accept") || "";
        const result = accept.includes("vnd.pgrst.object") ? localRecord : [localRecord];
        return new Response(JSON.stringify(result), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      return new Response(null, { status: method === "POST" ? 201 : 204 });
    }
  }
  return nativeFetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});
