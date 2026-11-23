(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.navigation');
  const scrim = document.querySelector('.nav-scrim');
  let navOpen = false;
  const narrow = window.matchMedia('(max-width: 900px)');
  function setNavigation(open, returnFocus = false) {
    navOpen = open;
    navigation.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню сайта' : 'Открыть меню сайта');
    navigation.inert = narrow.matches && !open;
    document.body.classList.toggle('locked', open);
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setNavigation(!navOpen));
  scrim.addEventListener('click', () => setNavigation(false, true));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNavigation(false)));
  narrow.addEventListener('change', () => setNavigation(false));
  setNavigation(false);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navOpen) setNavigation(false, true);
    if (event.key === 'Tab' && navOpen) {
      const items = [...navigation.querySelectorAll('a'), document.querySelector('.header-book'), toggle];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  let activeDialog = null;
  let dialogTrigger = null;
  const pendingClose = new WeakMap();
  function openDialog(dialog, trigger) {
    setNavigation(false);
    const oldTimer = pendingClose.get(dialog);
    if (oldTimer) clearTimeout(oldTimer);
    dialogTrigger = trigger;
    activeDialog = dialog;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('locked');
    requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
  }
  function closeDialog(dialog) {
    if (!dialog.open) return;
    dialog.classList.remove('is-open');
    const trigger = dialogTrigger;
    const finish = () => {
      dialog.close();
      if (activeDialog === dialog) activeDialog = null;
      document.body.classList.remove('locked');
      if (trigger && trigger.isConnected) trigger.focus({preventScroll: true});
    };
    if (reduceMotion.matches) finish();
    else pendingClose.set(dialog, setTimeout(finish, 200));
  }
  const booking = document.getElementById('booking-dialog');
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => openDialog(booking, button)));
  const photoDialog = document.getElementById('photo-dialog');
  document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
    const image = photoDialog.querySelector('img');
    image.src = button.dataset.photo;
    image.alt = button.dataset.caption;
    photoDialog.querySelector('figcaption').textContent = button.dataset.caption;
    openDialog(photoDialog, button);
  }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) closeDialog(dialog);
    });
  });
  const menu = document.querySelector('.menu-main');
  if (menu) {
    const search = document.getElementById('menu-search');
    const select = document.getElementById('category');
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const groups = [...document.querySelectorAll('[data-group]')];
    const reset = document.querySelector('.search-reset');
    const normalize = value => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();
    let selected = 'all';
    const initial = location.hash.slice(1);
    if (groups.some(group => group.dataset.group === initial)) selected = initial;
    function update() {
      const query = normalize(search.value);
      let count = 0;
      groups.forEach(group => {
        let inGroup = 0;
        group.querySelectorAll('.menu-card').forEach(card => {
          const match = (selected === 'all' || group.dataset.group === selected) && (!query || normalize(card.dataset.search).includes(query));
          card.hidden = !match;
          if (match) inGroup += 1;
        });
        group.hidden = !inGroup;
        count += inGroup;
      });
      buttons.forEach(button => {
        const active = button.dataset.filter === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      select.value = selected;
      menu.querySelector('.menu-count').textContent = `Блюд: ${count}`;
      menu.querySelector('.menu-empty').hidden = count > 0;
      reset.hidden = !query && selected === 'all';
    }
    buttons.forEach(button => button.addEventListener('click', () => { selected = button.dataset.filter; update(); }));
    select.addEventListener('change', () => { selected = select.value; update(); });
    search.addEventListener('input', update);
    reset.addEventListener('click', () => { selected = 'all'; search.value = ''; update(); search.focus(); });
    update();
  }
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const items = [...document.querySelectorAll('.reveal')];
    items.forEach(item => {
      const rect = item.getBoundingClientRect();
      if (rect.top > window.innerHeight + 60) item.classList.add('pending');
    });
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('pending');
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {rootMargin: '0px 0px 40px 0px', threshold: 0.06});
    items.forEach(item => observer.observe(item));
    reduceMotion.addEventListener('change', event => {
      if (event.matches) { observer.disconnect(); items.forEach(item => item.classList.remove('pending')); }
    });
  }
})();
