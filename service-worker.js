const CACHE_NAME="biz-fox-erp-shell-v18";
const APP_SHELL=["./","./index.html","./login.html","./staff.html","./staff.webmanifest","./offline.html","./manifest.webmanifest","./assets/icon.svg","./assets/biz-fox-erp-logo.png","./assets/css/app-update.css?v=1","./assets/css/app.css?v=15","./assets/js/app.js?v=14","./assets/js/supabase.js","./assets/js/auth.js?v=6","./assets/css/staff.css?v=10","./assets/js/staff.js?v=12"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match("./offline.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match("./offline.html"))));
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
