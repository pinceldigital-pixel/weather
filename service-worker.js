const CACHE_NAME='clima-card-daynight-icons';
const SHELL=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/icons/sun.svg','/assets/icons/partly.svg','/assets/icons/cloud.svg','/assets/icons/fog.svg','/assets/icons/rain.svg','/assets/icons/snow.svg','/assets/icons/storm.svg','/assets/icons/search.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.hostname.includes('open-meteo.com')){
    e.respondWith(caches.open('rt-api').then(cache=>fetch(e.request).then(r=>{cache.put(e.request,r.clone());return r}).catch(()=>cache.match(e.request))));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())); return r}).catch(()=>caches.match(e.request)));
});
