// ⚠️ Clave visible; para producción usar proxy/backend.
const API_KEY = "1b8667da28d347c66e6c0ae01033b6f5";
const UNITS = 'metric';
const LANG = 'es';

const $ = (s)=>document.querySelector(s);
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

function groupByDay(list){
  const map = new Map();
  list.forEach(i=>{
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
      const k = i.weather[0]?.description || i.weather[0]?.main;
      counts[k]=(counts[k]||0)+1;
    });
    const text = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
    const main = arr.find(Boolean)?.weather[0]?.main;
    return {date, max, min, text, main};
  });
}

async function fetchAll(lat, lon){
  const base = 'https://api.openweathermap.org/data/2.5';
  const qs = `lat=${lat}&lon=${lon}&units=${UNITS}&lang=${LANG}&appid=${API_KEY}`;
  const [curRes, fcRes, aqiRes] = await Promise.all([
    fetch(`${base}/weather?${qs}`),
    fetch(`${base}/forecast?${qs}`),
    fetch(`${base}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
  ]);
  if(!curRes.ok) throw new Error('Error current');
  const current = await curRes.json();
  const forecast = await fcRes.json();
  const aqi = await aqiRes.json().catch(()=>({}));
  return {current, forecast, aqi};
}

function apply({current, forecast, aqi}){
  const temp = Math.round(current.main.temp);
  const hi = Math.round(current.main.temp_max);
  const lo = Math.round(current.main.temp_min);
  const w = current.weather[0] || {};
  $('#temp-now').textContent = `${temp}°`;
  $('#high').textContent = `H: ${hi}°`;
  $('#low').textContent = `L: ${lo}°`;
  $('#icon-now').textContent = iconFor(w.main, w.description);
  $('#humidity').textContent = `${Math.round(current.main.humidity)}%`;

  let aqiIdx = aqi?.list?.[0]?.main?.aqi || 1; // 1..5
  const desc = ['Good','Fair','Moderate','Poor','Very Poor'][aqiIdx-1] || 'Good';
  $('#aqi').textContent = desc;
  const dot = $('#aqi-dot');
  dot.style.background = aqiIdx<=2? '#35d27a' : aqiIdx===3? '#f1c40f' : '#e74c3c';

  const next3 = forecast.list.slice(0,3);
  ['#h1','#h2','#h3'].forEach((id,i)=>{
    const it = next3[i]; if(!it) return;
    const d = new Date(it.dt*1000);
    const el = document.querySelector(id);
    el.querySelector('.h-icon').textContent = iconFor(it.weather[0]?.main, it.weather[0]?.description);
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

  $('#stamp').textContent = `Actualizado: ${new Date().toLocaleString()}`;
}

async function bootstrap(){
  function getPosition() {
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude, lon:p.coords.longitude}), ()=>resolve(null), {timeout:5000});
    });
  }
  const pos = await getPosition();
  const lat = pos?.lat ?? -34.6037;   // Buenos Aires fallback
  const lon = pos?.lon ?? -58.3816;
  const data = await fetchAll(lat, lon);
  apply(data);
}

document.getElementById('refresh').addEventListener('click', bootstrap);
bootstrap();
