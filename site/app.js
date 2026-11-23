const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
const navToggle=document.querySelector('.nav-toggle');
const nav=document.querySelector('.site-nav');
const mobileNavigation=window.matchMedia('(max-width:950px)');
nav.querySelectorAll('a').forEach((link,index)=>link.style.setProperty('--nav-order',index));

function setNav(open){
 const expanded=mobileNavigation.matches&&open;
 nav.classList.toggle('open',expanded);
 navToggle.setAttribute('aria-expanded',String(expanded));
 navToggle.setAttribute('aria-label',expanded?'Закрыть меню сайта':'Открыть меню сайта');
 nav.inert=mobileNavigation.matches&&!expanded;
 if(mobileNavigation.matches)nav.setAttribute('aria-hidden',String(!expanded));
 else nav.removeAttribute('aria-hidden');
 document.body.classList.toggle('nav-open',expanded);
}
function closeNav(){setNav(false)}
navToggle.addEventListener('click',()=>{
 const open=!nav.classList.contains('open');setNav(open);
 if(open)nav.querySelector('a').focus({preventScroll:true});
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&nav.classList.contains('open')){closeNav();navToggle.focus()}
});
document.addEventListener('click',event=>{
 if(!event.target.closest('.site-header')){
  const restoreFocus=nav.contains(document.activeElement);closeNav();
  if(restoreFocus)navToggle.focus({preventScroll:true});
 }
});
document.addEventListener('focusin',event=>{
 if(nav.classList.contains('open')&&!event.target.closest('.site-header'))closeNav();
});
mobileNavigation.addEventListener('change',closeNav);
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeNav));
setNav(false);

const booking=document.getElementById('booking-dialog');
const photoDialog=document.getElementById('photo-dialog');
const dialogAnimations=new Map();
function stopDialogAnimation(dialog){
 const animation=dialogAnimations.get(dialog);
 dialogAnimations.delete(dialog);
 animation?.cancel();
}
function openDialog(dialog){
 closeNav();stopDialogAnimation(dialog);dialog.classList.remove('is-closing');
 if(!dialog.open)dialog.showModal();
 document.body.classList.add('locked');
 if(motionPreference.matches||!dialog.animate)return;
 const animation=dialog.animate(
  [{opacity:0,transform:'translateY(8px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],
  {duration:240,easing:'cubic-bezier(.22,1,.36,1)'}
 );
 dialogAnimations.set(dialog,animation);
 animation.onfinish=()=>{if(dialogAnimations.get(dialog)===animation)dialogAnimations.delete(dialog)};
}
function closeDialog(dialog){
 if(!dialog.open||dialog.classList.contains('is-closing'))return;
 stopDialogAnimation(dialog);
 if(motionPreference.matches||!dialog.animate){dialog.close();return}
 dialog.classList.add('is-closing');
 const animation=dialog.animate(
  [{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(5px) scale(.99)'}],
  {duration:160,easing:'ease-in',fill:'forwards'}
 );
 dialogAnimations.set(dialog,animation);
 animation.onfinish=()=>{if(dialogAnimations.get(dialog)===animation)dialog.close()};
}
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>openDialog(booking)));
document.querySelectorAll('dialog').forEach(dialog=>{
 dialog.querySelector('[data-close]').addEventListener('click',()=>closeDialog(dialog));
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog)});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(dialog);
 });
 dialog.addEventListener('close',()=>{
  stopDialogAnimation(dialog);dialog.classList.remove('is-closing');
  if(!document.querySelector('dialog[open]'))document.body.classList.remove('locked');
  if(dialog===photoDialog)dialog.querySelector('img').removeAttribute('src');
 });
});
motionPreference.addEventListener('change',()=>{
 if(!motionPreference.matches)return;
 for(const dialog of [...dialogAnimations.keys()]){
  const closing=dialog.classList.contains('is-closing');stopDialogAnimation(dialog);
  if(closing)dialog.close();
 }
});
document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>{
 const img=photoDialog.querySelector('img');img.src=button.dataset.photo;img.alt=button.dataset.caption;
 photoDialog.querySelector('figcaption').textContent=button.dataset.caption;openDialog(photoDialog);
}));
const bookingForm=document.getElementById('booking-form');
const dateField=bookingForm.elements.date;
const localNow=new Date();
const localDate=[localNow.getFullYear(),String(localNow.getMonth()+1).padStart(2,'0'),String(localNow.getDate()).padStart(2,'0')].join('-');
dateField.min=localDate;
bookingForm.addEventListener('submit',event=>{
 event.preventDefault();
 const data=new FormData(bookingForm);
 const parts=['Здравствуйте! Хочу забронировать стол в ресторане «Рыба моей мечты».'];
 if(data.get('date')){const [y,m,d]=data.get('date').split('-');parts.push('Дата: '+d+'.'+m+'.'+y+'.')}
 if(data.get('time'))parts.push('Время: '+data.get('time')+'.');
 parts.push('Гостей: '+data.get('guests')+'.');
 if(String(data.get('comment')||'').trim())parts.push(String(data.get('comment')).trim());
 window.open('https://api.whatsapp.com/send?phone=79147559021&text='+encodeURIComponent(parts.join('\n')),'_blank','noopener,noreferrer');
});

const menu=document.querySelector('[data-menu]');
if(menu){
 const groups=[...menu.querySelectorAll('.menu-group')];
 const cards=[...menu.querySelectorAll('.menu-card')];
 const buttons=[...document.querySelectorAll('[data-category]')];
 const select=document.getElementById('category-select');
 const search=document.getElementById('menu-search');
 const clear=document.querySelector('.search-clear');
 const empty=menu.querySelector('.empty-results');
 const count=document.getElementById('menu-count');
 const requested=new URL(location.href).searchParams.get('category');
 let active=groups.some(g=>g.id===requested)?requested:groups[0].id;
 const normalize=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/гребеш[а-яё]*/g,'гребеш').replace(/креветк[а-яё]*/g,'креветк').replace(/лосос[а-яёь]*/g,'лосос').replace(/устриц[а-яё]*/g,'устриц').replace(/\s+/g,' ').trim();
 function update(){
  const query=normalize(search.value);let visible=0;
  groups.forEach(group=>{
   let groupCount=0;
   group.querySelectorAll('.menu-card').forEach(card=>{const match=!query||normalize(card.dataset.search).includes(query);card.hidden=!match;if(match)groupCount++});
   group.hidden=query?groupCount===0:group.id!==active;
   if(!group.hidden)visible+=groupCount;
  });
  buttons.forEach(button=>button.setAttribute('aria-pressed',String(!query&&button.dataset.category===active)));
  select.value=active;clear.hidden=!query;empty.hidden=visible>0;
  count.textContent=query?'Найдено позиций: '+visible:'Позиций в категории: '+visible;
 }
 function activate(id){active=id;search.value='';update();const url=new URL(location.href);url.searchParams.set('category',id);history.replaceState(null,'',url);}
 buttons.forEach(button=>button.addEventListener('click',()=>{activate(button.dataset.category);if(window.innerWidth>700)document.querySelector('.menu-tools').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}));
 select.addEventListener('change',()=>activate(select.value));
 search.addEventListener('input',update);
 clear.addEventListener('click',()=>{search.value='';update();search.focus()});
 update();
}

const revealTargets=[...document.querySelectorAll(
 'main .section-heading, main .dish-tile, main .split-copy, main .split-photos, '+
 'main .chef-photo, main .photo-band .container, main .service, main .brand-statement, '+
 'main .cafe-grid article, main .delivery-features > div, '+
 'main .order-step > div, main .order-step > img, main .contact-block, '+
 'main .contact-photo, main .certificate, .booking-band .container'
)];
const revealedElements=new WeakSet();
let revealObserver;

function showReveal(element){
 element.classList.remove('scroll-reveal');
 element.classList.remove('is-visible');
 revealedElements.add(element);
 revealObserver?.unobserve(element);
}

function observeScrollReveals(){
 revealObserver?.disconnect();
 if(motionPreference.matches||!('IntersectionObserver' in window)){
  revealTargets.forEach(showReveal);
  return;
 }
 try{
  revealObserver=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const element=entry.target;
    element.classList.add('is-visible');
    revealedElements.add(element);
    revealObserver.unobserve(element);
   }
  },{threshold:0,rootMargin:'0px 0px 100px 0px'});

  revealTargets.forEach(element=>{
   if(revealedElements.has(element))return;
   if(!element.getClientRects().length||element.getBoundingClientRect().top<=innerHeight+100){
    revealedElements.add(element);
    return;
   }
   element.classList.add('scroll-reveal');
   revealObserver.observe(element);
  });
 }catch{
  revealObserver?.disconnect();
  revealTargets.forEach(showReveal);
 }
}

document.addEventListener('focusin',event=>{
 revealTargets.forEach(element=>{if(element.contains(event.target))showReveal(element)});
});
motionPreference.addEventListener('change',observeScrollReveals);
observeScrollReveals();

const seaScenes=[...document.querySelectorAll('[data-sea-scene]')].map(element=>({
 element,creatures:[...element.querySelectorAll('.sea-creature')],progress:0,target:0
}));
let seaObserver;
let seaFrame=0;
let seaLastTime=0;
const activeSeaScenes=new Set();

function renderSeaFrame(time){
 seaFrame=0;
 const elapsed=seaLastTime?Math.min(time-seaLastTime,40):16;
 seaLastTime=time;
 const easing=1-Math.exp(-elapsed/85);
 const viewport=window.innerHeight;
 let moving=false;
 const updates=[];
 activeSeaScenes.forEach(scene=>{
  const rect=scene.element.getBoundingClientRect();
  scene.target=Math.max(0,Math.min(1,(viewport-rect.top)/(viewport*.76+rect.height*.5)));
  scene.progress+=(scene.target-scene.progress)*easing;
  if(Math.abs(scene.target-scene.progress)<.001)scene.progress=scene.target;
  else moving=true;
  updates.push(scene);
 });
 updates.forEach(scene=>{
  scene.creatures.forEach(creature=>{
   const direction=creature.classList.contains('sea-from-left')?-1:1;
   creature.style.setProperty('--sea-x',(direction*(112-scene.progress*94)).toFixed(3)+'%');
   creature.style.setProperty('--sea-angle',(direction*(8-scene.progress*10)).toFixed(3)+'deg');
  });
 });
 if(moving)seaFrame=requestAnimationFrame(renderSeaFrame);
 else seaLastTime=0;
}

function scheduleSeaFrame(){
 if(!motionPreference.matches&&activeSeaScenes.size&&!seaFrame){
  seaFrame=requestAnimationFrame(renderSeaFrame);
 }
}

function setupSeaMotion(){
 seaObserver?.disconnect();
 if(seaFrame)cancelAnimationFrame(seaFrame);
 seaFrame=0;seaLastTime=0;activeSeaScenes.clear();
 seaScenes.forEach(scene=>{
  scene.progress=0;
  scene.element.classList.remove('sea-motion-ready');
  scene.creatures.forEach(creature=>{
   creature.style.removeProperty('--sea-x');
   creature.style.removeProperty('--sea-angle');
  });
 });
 if(!seaScenes.length||motionPreference.matches||!('IntersectionObserver' in window))return;
 try{
  seaObserver=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    const scene=seaScenes.find(item=>item.element===entry.target);
    if(entry.isIntersecting)activeSeaScenes.add(scene);
    else activeSeaScenes.delete(scene);
   });
   scheduleSeaFrame();
  },{rootMargin:'160px 0px',threshold:0});
  seaScenes.forEach(scene=>{
   scene.element.classList.add('sea-motion-ready');
   seaObserver.observe(scene.element);
  });
 }catch{
  seaObserver?.disconnect();
  seaScenes.forEach(scene=>scene.element.classList.remove('sea-motion-ready'));
 }
}

window.addEventListener('scroll',scheduleSeaFrame,{passive:true});
window.addEventListener('resize',scheduleSeaFrame,{passive:true});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&seaFrame){cancelAnimationFrame(seaFrame);seaFrame=0;seaLastTime=0}
 else scheduleSeaFrame();
});
motionPreference.addEventListener('change',setupSeaMotion);
setupSeaMotion();
