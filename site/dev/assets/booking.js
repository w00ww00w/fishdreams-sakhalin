(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('floorplan-data').textContent);
  const $ = id => document.getElementById(id);
  const date = $('visit-date'), time = $('visit-time'), guests = $('visit-guests');
  const form = $('reservation-form'), success = $('reservation-success');
  const storageKey = 'fishdreams-dev-reservations-v1';
  const zone = 'Asia/Sakhalin';
  let room = data.rooms[0], selected = null, bookings = [], storageAvailable = true;
  const dateParts = new Intl.DateTimeFormat('en', {timeZone: zone,year:'numeric',month:'2-digit',day:'2-digit'});
  function islandDate(now = new Date()) {
    const p = Object.fromEntries(dateParts.formatToParts(now).map(p => [p.type,p.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function addDays(value, days) {
    const d = new Date(value + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }
  function minutes(value) {const [h,m] = value.split(':').map(Number);return h*60+m;}
  function endTime(value) {const end=minutes(value)+120;return `${String(Math.floor(end/60)%24).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;}
  function dateLabel(value, short = false) {
    return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:short?'short':'long',...(short?{}:{weekday:'short'})}).format(new Date(value+'T12:00:00Z'));
  }
  function guestLabel(count) {return `${count} ${count===1?'гость':count<5?'гостя':'гостей'}`;}
  function escape(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function validBooking(b) {
    return b && typeof b.id==='string' && b.id.length<60 && /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
      /^\d{2}:\d{2}$/.test(b.time) && Number.isInteger(b.guests) && b.guests>=1 && b.guests<=8 &&
      data.rooms.some(r=>r.id===b.room && r.tables.some(t=>t.id===b.table));
  }
  try {const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');bookings=Array.isArray(saved)?saved.filter(validBooking).slice(-100):[];}
  catch {storageAvailable=false;}
  function save() {
    try {localStorage.setItem(storageKey,JSON.stringify(bookings));}
    catch {storageAvailable=false;}
  }
  function overlaps(a,b) {return Math.abs(minutes(a)-minutes(b))<120;}
  function demoBusy(table) {
    // Seeded fixture reservations have fixed two-hour intervals, just like saved demo bookings.
    let seed=0;for(const char of date.value+table.id)seed=(seed*31+char.charCodeAt(0))>>>0;
    if(seed%4!==0)return false;
    const start=12*60+(seed%9)*60;
    return Math.abs(minutes(time.value)-start)<120;
  }
  function tableState(table) {
    if(!visitValid(false))return 'small';
    if(bookings.some(b=>b.table===table.id&&b.date===date.value&&overlaps(b.time,time.value))||demoBusy(table))return 'busy';
    if(table.seats<Number(guests.value))return 'small';
    return selected?.id===table.id?'selected':'free';
  }
  function visitValid(showError=true) {
    const today=islandDate();
    let message='';
    if(!date.value||date.value<today||date.value>date.max||!date.validity.valid)message='Выберите дату в ближайшие 30 дней.';
    else if(!time.value||time.selectedOptions[0]?.disabled)message='На эту дату доступного времени уже нет. Выберите следующий день.';
    else if(date.value===today) {
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
      if(minutes(time.value)<=Number(p.hour)*60+Number(p.minute))message='Это время уже прошло по сахалинскому времени. Выберите другое.';
    }
    if(showError){$('visit-error').textContent=message;$('visit-error').hidden=!message;}
    return !message;
  }
  function updateTimes() {
    const previous=time.value;
    const nowParts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const p=Object.fromEntries(nowParts.map(x=>[x.type,x.value]));
    const nowMinutes=Number(p.hour)*60+Number(p.minute);
    time.innerHTML='';
    for(let start=720;start<=1320;start+=30){
      const value=`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`;
      const option=document.createElement('option');option.value=value;option.textContent=value;
      option.disabled=date.value===islandDate()&&start<=nowMinutes;time.append(option);
    }
    const preferred=[...time.options].find(o=>o.value===previous&&!o.disabled)||[...time.options].find(o=>o.value==='19:00'&&!o.disabled)||[...time.options].find(o=>!o.disabled);
    time.value=preferred?.value||'';
  }
  function renderMap() {
    const layer=$('table-layer');layer.replaceChildren();let available=0;
    for(const table of room.tables) {
      const state=tableState(table);if(state==='free'||state==='selected')available++;
      const place=document.createElement('div');place.className='table-place';place.style.left=table.x+'%';place.style.top=table.y+'%';
      const button=document.createElement('button');button.type='button';button.className='table-button';button.dataset.state=state;button.dataset.kind=table.kind;button.dataset.table=table.id;
      button.disabled=state==='busy'||state==='small';button.setAttribute('aria-pressed',String(state==='selected'));
      const suffix=state==='busy'?'занят':state==='small'?'недостаточно мест':state==='selected'?'выбран':'свободен';
      button.setAttribute('aria-label',`Стол ${table.number}, ${table.seats} мест, ${suffix}`);
      button.innerHTML=`<strong>${table.number}</strong><small>${table.seats}</small>`;
      button.addEventListener('click',()=>{selected=table;renderMap();renderSelection();$('reservation-status').textContent=`Выбран стол ${table.number}. ${table.seats} мест. Контактная форма ниже схемы.`;});
      place.append(button);
      for(const side of (table.seats>2?['n','s','e','w']:['n','s'])) {const chair=document.createElement('span');chair.className='table-chair chair-'+side;chair.setAttribute('aria-hidden','true');place.append(chair);}
      layer.append(place);
    }
    $('available-count').textContent=visitValid(false)?`${available} ${available===1?'свободный столик':available<5&&available>1?'свободных столика':'свободных столиков'}`:'Нет времени';
  }
  function renderSelection() {
    $('selection-empty').hidden=!!selected;$('selection-details').hidden=!selected;
    $('map-continue').hidden=!selected;if(selected)$('map-continue').textContent=`Продолжить · стол ${selected.number}`;
    if(!selected)return;
    $('selected-number').textContent=selected.number;$('selected-room').textContent=room.name;
    $('selected-description').textContent=selected.detail;$('summary-date').textContent=dateLabel(date.value);
    $('summary-time').textContent=`${time.value}–${endTime(time.value)}`;$('summary-guests').textContent=guestLabel(Number(guests.value));
    $('summary-capacity').textContent=`до ${selected.seats} гостей`;
  }
  function refresh() {
    visitValid();
    if(selected && !['free','selected'].includes(tableState(selected))){selected=null;$('reservation-status').textContent='Параметры визита изменились. Выберите другой столик.';}
    $('form-error').hidden=true;renderMap();renderSelection();
  }
  function changeRoom(id) {
    room=data.rooms.find(r=>r.id===id);selected=null;
    document.querySelectorAll('.room-tabs [data-room]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.room===id)));
    $('room-photo').src=room.photo;$('room-photo').alt=`Интерьер: ${room.name}`;
    $('room-name').textContent=room.name;$('room-description').textContent=room.description;
    $('floorplan').dataset.room=id;$('floorplan').setAttribute('aria-label',`Схема: ${room.name}`);
    document.querySelector('.floor-zone-top').textContent=id==='white'?'Мягкая мебель':'Диванные группы';
    refresh();
  }
  function renderBookings() {
    $('booking-count').textContent=String(bookings.length);
    const list=$('saved-list');list.replaceChildren();
    if(!bookings.length){list.innerHTML='<p class="empty-bookings">У вас пока нет демоброней. Выберите столик на схеме.</p>';return;}
    for(const booking of [...bookings].reverse()) {
      const r=data.rooms.find(r=>r.id===booking.room),t=r.tables.find(t=>t.id===booking.table);
      const item=document.createElement('article');item.className='saved-item';
      item.innerHTML=`<strong>${t.number}</strong><div><h3>${r.name} · ${dateLabel(booking.date)} · ${booking.time}–${endTime(booking.time)}</h3><p>${guestLabel(booking.guests)} · Демо ${escape(booking.id)}</p></div>`;
      const cancel=document.createElement('button');cancel.type='button';cancel.className='text-link';cancel.textContent='Отменить демобронь';cancel.setAttribute('aria-label',`Отменить демобронь ${t.number}, ${dateLabel(booking.date)}, ${booking.time}`);
      cancel.addEventListener('click',()=>{bookings=bookings.filter(b=>b.id!==booking.id);save();renderBookings();refresh();$('reservation-status').textContent=`Демобронь стола ${t.number} отменена.`;});
      item.append(cancel);list.append(item);
    }
  }
  function showBookings() {$('saved-bookings').hidden=false;$('saved-bookings').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  date.min=islandDate();date.max=addDays(date.min,30);date.value=addDays(date.min,1);updateTimes();
  date.addEventListener('change',()=>{updateTimes();refresh();});time.addEventListener('change',refresh);guests.addEventListener('change',refresh);
  document.querySelectorAll('[data-room]').forEach(button=>button.addEventListener('click',()=>changeRoom(button.dataset.room)));
  $('scheme-notice').textContent=data.notice;
  for(const source of data.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.target='_blank';a.rel='noopener noreferrer';$('scheme-sources').append(a);}
  $('map-continue').addEventListener('click',()=>{document.querySelector('.reservation-summary').scrollIntoView({block:'start',behavior:'instant'});$('guest-name').focus({preventScroll:true});});
  $('show-bookings').addEventListener('click',showBookings);$('hide-bookings').addEventListener('click',()=>{$('saved-bookings').hidden=true;});
  function closeSuccess(){success.close();}
  $('close-success').addEventListener('click',closeSuccess);$('done-success').addEventListener('click',closeSuccess);
  $('view-success-bookings').addEventListener('click',()=>{closeSuccess();showBookings();});
  success.addEventListener('close',()=>{document.body.classList.remove('locked');});
  form.addEventListener('submit',event=>{
    event.preventDefault();$('form-error').hidden=true;
    if(!visitValid()||!selected){$('form-error').textContent='Проверьте время визита и выберите свободный столик.';$('form-error').hidden=false;return;}
    const name=$('guest-name').value.trim(),phone=$('guest-phone').value.replace(/\D/g,'');
    if(!name||phone.length<10||phone.length>15){$('form-error').textContent='Укажите имя и телефон из 10–15 цифр. Для демо подойдут вымышленные данные.';$('form-error').hidden=false;return;}
    // Re-read other tabs before confirming. This demo has no server and is not a cross-device lock.
    if(storageAvailable){try{const fresh=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(fresh))bookings=fresh.filter(validBooking).slice(-100);}catch{storageAvailable=false;}}
    if(!['free','selected'].includes(tableState(selected))){refresh();$('form-error').textContent='Этот стол уже выбран в другом окне демо. Выберите другой.';$('form-error').hidden=false;return;}
    const table=selected;
    const booking={id:'FD-'+crypto.randomUUID().slice(0,8).toUpperCase(),table:table.id,room:room.id,date:date.value,time:time.value,guests:Number(guests.value)};
    bookings.push(booking);save();renderBookings();
    $('success-summary').innerHTML=`<strong>${room.name} · стол ${table.number}</strong><br>${dateLabel(booking.date)} · ${booking.time}–${endTime(booking.time)}<br>${guestLabel(booking.guests)}`;
    $('success-reference').textContent=`Демо ${booking.id}${storageAvailable?'':' · до закрытия этой вкладки'}`;
    form.reset();selected=null;refresh();window.FamilyChrome?.closeNavigation();success.showModal();document.body.classList.add('locked');$('done-success').focus();
  });
  window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{const items=JSON.parse(event.newValue||'[]');bookings=Array.isArray(items)?items.filter(validBooking).slice(-100):[];renderBookings();refresh();}catch{/* Ignore malformed storage from another tab. */}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  renderBookings();changeRoom(room.id);
})();
