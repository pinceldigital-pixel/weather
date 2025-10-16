// Íconos SVG + grid 2 columnas responsive + fondo día/noche
const $ = (id)=>document.getElementById(id);

function isNight(){ const h = new Date().getHours(); return (h>=20||h<6); }
function darken(color){ const c=parseInt(color.substring(1),16); let r=(c>>16)&0xff,g=(c>>8)&0xff,b=c&0xff; r=Math.floor(r*0.5); g=Math.floor(g*0.5); b=Math.floor(b*0.5); return `rgb(${r},${g},${b})`; }
function colorFor(code){
  if ([0,1,2].includes(code)) return '#00a0ff'; // soleado
  if ([3,45,48].includes(code)) return '#6e7b85'; // nublado
  if ([61,63,65,66,67,80,81,82].includes(code)) return '#2b5876'; // lluvia
  if ([71,73,75,77,85,86].includes(code)) return '#76b2fe'; // nieve
  if ([95,96,99].includes(code)) return '#222'; // tormenta
  return '#00a0ff';
}
function iconFor(code){
  if ([0].includes(code)) return {src:'assets/icons/sun.svg', cls:'sun', text:'Soleado'};
  if ([1,2].includes(code)) return {src:'assets/icons/partly.svg', cls:'sun', text:'Parcial'};
  if ([3].includes(code)) return {src:'assets/icons/cloud.svg', cls:'cloud', text:'Nublado'};
  if ([45,48].includes(code)) return {src:'assets/icons/fog.svg', cls:'cloud', text:'Niebla'};
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return {src:'assets/icons/rain.svg', cls:'rain', text:'Lluvia'};
  if ([71,73,75,77,85,86].includes(code)) return {src:'assets/icons/snow.svg', cls:'', text:'Nieve'};
  if ([95,96,99].includes(code)) return {src:'assets/icons/storm.svg', cls:'', text:'Tormenta'};
  return {src:'assets/icons/partly.svg', cls:'', text:'—'};
}

async function reverseGeocode(lat, lon){
  try{
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=es&format=json`);
    const d = await r.json();
    const f = d?.results?.[0];
    return f ? `${f.name}${f.country_code ? ', '+f.country_code : ''}` : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }catch{return `${lat.toFixed(2)}, ${lon.toFixed(2)}`}
}

async function load(lat, lon, nameMaybe=null){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset`;
  const r = await fetch(url); const data = await r.json();
  const c = data.current_weather; const daily = data.daily;
  const city = nameMaybe || await reverseGeocode(lat, lon);

  // Fondo según clima + hora
  let color = colorFor(c.weathercode);
  if (isNight()) color = darken(color);
  document.querySelector('#card').style.backgroundColor = color;

  $('city').textContent = city.toUpperCase();
  $('date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'}).toUpperCase();
  $('temp').textContent = Math.round(c.temperature)+'°';
  const ic = iconFor(c.weathercode);
  $('desc').textContent = ic.text + ' · ' + Math.round(c.windspeed) + ' km/h';
  $('wind').textContent = Math.round(c.windspeed)+' km/h';
  $('range').textContent = Math.round(daily.temperature_2m_max[0])+'°/'+Math.round(daily.temperature_2m_min[0])+'°';
  const sr = new Date(daily.sunrise[0]); $('sunrise').textContent = sr.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  // Grid previsión (7 días) - tarjetas verticales compactas
  const g = $('forecastGrid'); g.innerHTML='';
  for(let i=0;i<daily.time.length && i<7;i++){
    const code = daily.weathercode[i];
    const ico = iconFor(code);
    const el = document.createElement('div');
    el.className = 'day';
    el.innerHTML = `
      <img class="ico ${ico.cls}" src="${ico.src}" alt="" width="52" height="52">
      <div class="d">${new Date(daily.time[i]+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</div>
      <div class="t">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>
      <div class="s">${ico.text}</div>
    `;
    g.appendChild(el);
  }

  localStorage.setItem('lastIcons', JSON.stringify({lat,lon,city,c,daily}));
}

function locate(){
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(p=>load(p.coords.latitude,p.coords.longitude),()=>{}, {timeout:8000, maximumAge:300000});
}

window.addEventListener('load',()=>{
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js');
  // preload fallback desde storage si lo hay
  try{
    const raw = localStorage.getItem('lastIcons');
    if(raw){
      const {city,c,daily} = JSON.parse(raw);
      let color = colorFor(c.weathercode); if(isNight()) color=darken(color);
      document.querySelector('#card').style.backgroundColor = color;
      $('city').textContent = city.toUpperCase();
      $('date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', day:'numeric', month:'long'}).toUpperCase();
      $('temp').textContent = Math.round(c.temperature)+'°';
      const ic = iconFor(c.weathercode);
      $('desc').textContent = ic.text + ' · ' + Math.round(c.windspeed) + ' km/h';
      $('wind').textContent = Math.round(c.windspeed)+' km/h';
      $('range').textContent = Math.round(daily.temperature_2m_max[0])+'°/'+Math.round(daily.temperature_2m_min[0])+'°';
      const sr = new Date(daily.sunrise[0]); $('sunrise').textContent = sr.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      const g = $('forecastGrid'); g.innerHTML='';
      for(let i=0;i<daily.time.length && i<7;i++){
        const code = daily.weathercode[i];
        const ico = iconFor(code);
        const el = document.createElement('div');
        el.className = 'day';
        el.innerHTML = `
          <img class="ico ${ico.cls}" src="${ico.src}" alt="" width="52" height="52">
          <div class="d">${new Date(daily.time[i]+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}).toUpperCase()}</div>
          <div class="t">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</div>
          <div class="s">${ico.text}</div>
        `;
        g.appendChild(el);
      }
    }
  }catch{}
  // luego ubicamos
  locate();
});


function searchAndLoadByName(q){
  if(!q) return;
  fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=es&format=json`)
    .then(r=>r.json())
    .then(results=>{
      const r = results?.results?.[0];
      if(r){ load(r.latitude, r.longitude, `${r.name}${r.country_code?', '+r.country_code:''}`); }
      else alert('No encontré esa ciudad.');
    }).catch(()=>alert('Error buscando la ciudad.'));
}
document.addEventListener('DOMContentLoaded', () => {
  const dlg = document.getElementById('searchDlg');
  const searchBtn = document.getElementById('searchBtn');
  const goSearch = document.getElementById('goSearch');
  if (searchBtn){
    searchBtn.addEventListener('click', () => {
      if (dlg && typeof dlg.showModal === 'function') {
        dlg.showModal();
      } else {
        const q = prompt('Buscar ciudad:');
        searchAndLoadByName(q);
      }
    });
  }
  if (goSearch){
    goSearch.addEventListener('click', (e)=>{
      e.preventDefault();
      const q = document.getElementById('searchInput').value.trim();
      if(!q) return;
      searchAndLoadByName(q);
      if (dlg && typeof dlg.close === 'function') dlg.close();
    });
  }
});
