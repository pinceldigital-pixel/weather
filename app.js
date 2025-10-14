// app.js — sin geolocalización, con timeout y fallback
const API_KEY = "1b8667da28d347c66e6c0ae01033b6f5";
const UNITS = 'metric';
const LANG = 'es';
const LAT = -34.6037;   // Buenos Aires fijo
const LON = -58.3816;

const $ = (s)=>document.querySelector(s);
function setText(sel, v){ const el=$(sel); if(el) el.textContent=v; }
const ICONS = {clear:'☀️', clouds:'☁️', rain:'🌧️', storm:'⛈️', snow:'❄️', fog:'🌫️'};
const iconFor = (main, desc='')=>{
  const t=(desc||main||'').toLowerCase();
  if(t.includes('tormenta')) return ICONS.storm;
  if(t.includes('lluv')) return ICONS.rain;
  if(t.includes('nieve')) return ICONS.snow;
  if(t.includes('niebla')||t.includes('nebl')) return ICONS.fog;
  if(t.includes('despe')||t.includes('sol')||main==='Clear') return ICONS.clear;
  if(t.includes('nube')||main==='Clouds') return ICONS.clouds;
  return ICONS.clouds;
};

function timeout(promise, ms, label='request') {
  let t; 
  const to = new Promise((_,rej)=> t=setTimeout(()=>rej(new Error(label+' timeout')), ms));
  return Promise.race([promise.finally(()=>clearTimeout(t)), to]);
}

function groupByDay(list){
  const map = new Map();
  (list||[]).forEach(i=>{
    const d = new Date(i.dt*1000);
    const key = d.toISOString().slice(0,10);
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(i);
  });
  return Array.from(map.entries()).map(([date, arr])=>{
    let max=-Infinity, min=Infinity; 
    const counts={};
    arr.forEach(i=>{
      max = Math.max(max, i.main.temp_max);
      min = Math.min(min, i.main.temp_min);
      const k = i.weather?.[0]?.description || i.weather?.[0]?.main || 'clouds';
      counts[k]=(counts[k]||0)+1;
    });
    const text = Object.entries(counts).sort((a,b)=>b[1]-a[1])?.[0]?.[0] ?? 'clouds';
    const main = arr?.[0]?.weather?.[0]?.main ?? 'Clouds';
    return {date, max, min, text, main};
  });
}

async function fetchOpenWeather(lat, lon){
  const base = 'https://api.openweathermap.org/data/2.5';
  const qs = `lat=${lat}&lon=${lon}&units=${UNITS}&lang=${LANG}&appid=${API_KEY}`;
  const curP = fetch(`${base}/weather?${qs}`).then(r=>r.ok?r.json():Promise.reject(new Error('weather '+r.status)));
  const fcP  = fetch(`${base}/forecast?${qs}`).then(r=>r.ok?r.json():Promise.reject(new Error('forecast '+r.status)));
  const aqiP = fetch(`${base}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`).then(r=>r.ok?r.json():{}).catch(()=>({}));
  const [current, forecast, aqi] = await Promise.all([timeout(curP, 5000, 'weather'), timeout(fcP, 5000, 'forecast'), timeout(aqiP, 5000, 'aqi')]);
  return {source:'openweather', current, forecast, aqi};
}

async function fetchOpenMeteo(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,weathercode&forecast_days=4&timezone=auto`;
  const res = await timeout(fetch(url), 5000, 'open-meteo');
  if(!res.ok) throw new Error('open-meteo '+res.status);
  const j = await res.json();
  const nowIdx = 0;
  const current = { 
    main: { temp: j.hourly.temperature_2m[nowIdx], temp_min: j.hourly.temperature_2m[nowIdx], temp_max: j.hourly.temperature_2m[nowIdx], humidity: j.hourly.relative_humidity_2m[nowIdx] },
    weather: [{ main: 'Clouds', description: 'nublado' }]
  };
  const forecast = { list: j.hourly.time.map((t,i)=>({ dt: Math.floor(new Date(t).getTime()/1000), main: { temp: j.hourly.temperature_2m[i], temp_min: j.hourly.temperature_2m[i], temp_max: j.hourly.temperature_2m[i] }, weather: [{ main:'Clouds', description:'nublado' }] })) };
  const aqi = { list: [{ main: { aqi: 2 } }] };
  return {source:'openmeteo', current, forecast, aqi};
}

function paintNow(c){ 
  const temp = Math.round(c.main.temp);
  const hi = Math.round(c.main.temp_max);
  const lo = Math.round(c.main.temp_min);
  const w = c.weather?.[0] || {main:'Clouds', description:'nublado'};
  setText('#temp-now', `${temp}°`);
  setText('#high', `H: ${hi}°`);
  setText('#low', `L: ${lo}°`);
  const iconEl = document.querySelector('#icon-now');
  if(iconEl) iconEl.textContent = iconFor(w.main, w.description);
  setText('#humidity', `${Math.round(c.main.humidity||0)}%`);
}

function paintRest(forecast, aqi, source){
  try {
    let aqiIdx = aqi?.list?.[0]?.main?.aqi || 1; // 1..5
    const desc = ['Good','Fair','Moderate','Poor','Very Poor'][aqiIdx-1] || 'Good';
    setText('#aqi', desc);
    const dot = document.querySelector('#aqi-dot');
    if(dot) dot.style.background = aqiIdx<=2? '#35d27a' : aqiIdx===3? '#f1c40f' : '#e74c3c';

    const next3 = (forecast.list||[]).slice(0,3);
    ['#h1','#h2','#h3'].forEach((id,i)=>{
      const it = next3[i]; if(!it) return;
      const d = new Date(it.dt*1000);
      const el = document.querySelector(id); if(!el) return;
      el.querySelector('.h-icon').textContent = iconFor(it.weather?.[0]?.main, it.weather?.[0]?.description);
      el.querySelector('.h-time').textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      el.querySelector('.h-temp').textContent = `${it.main.temp>0?'+':''}${Math.round(it.main.temp)}°`;
    });

    const days = groupByDay(forecast.list).slice(0,4);
    const names = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    ['#d1','#d2','#d3','#d4'].forEach((id,i)=>{
      const d = days[i]; if(!d) return; const el = document.querySelector(id);
      const date = new Date(d.date);
      el.querySelector('.d-name').textContent = i===0? 'Hoy' : names[date.getDay()];
      el.querySelector('.d-icon').textContent = iconFor(d.main, d.text);
      el.querySelector('.max').textContent = `${d.max>0?'+':''}${Math.round(d.max)}°`;
      el.querySelector('.min').textContent = `${d.min>0?'+':''}${Math.round(d.min)}°`;
    });

    setText('#stamp', `Actualizado: ${new Date().toLocaleString()} (${source})`);
  } catch(e) { console.warn('paintRest', e); }
}

async function bootstrap(){
  setText('#stamp','Buscando...');
  try { 
    let data;
    try { data = await fetchOpenWeather(LAT, LON); }
    catch (e) { console.warn('OW fallo → Open-Meteo', e); data = await fetchOpenMeteo(LAT, LON); }
    paintNow(data.current);
    paintRest(data.forecast, data.aqi, data.source);
  } catch (e) {
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:#B91C1C;color:#fff;padding:10px 14px;font-family:system-ui;z-index:9999';
    err.textContent = 'No se pudo cargar el clima: ' + e.message;
    document.body.appendChild(err);
    setText('#stamp', 'Error');
  }
}

document.getElementById('refresh')?.addEventListener('click', bootstrap);
bootstrap();
