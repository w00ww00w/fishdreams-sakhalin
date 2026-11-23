(() => {
  'use strict';
  const header = document.querySelector('.family-header');
  if (!header) return;
  const navigation = header.querySelector('.family-navigation');
  const toggle = header.querySelector('.family-nav-toggle');
  const scrim = document.querySelector('.family-nav-scrim');
  const mobile = matchMedia('(max-width: 1100px)');
  let opened = false;
  function setNavigation(open, restoreFocus = false) {
    opened = mobile.matches && open;
    navigation.classList.toggle('is-open', opened);
    scrim.classList.toggle('is-open', opened);
    toggle.setAttribute('aria-expanded', String(opened));
    toggle.setAttribute('aria-label', opened ? 'Закрыть меню сайта' : 'Открыть меню сайта');
    navigation.inert = mobile.matches && !opened;
    if (mobile.matches) navigation.setAttribute('aria-hidden', String(!opened));
    else navigation.removeAttribute('aria-hidden');
    document.body.classList.toggle('family-nav-open', opened);
    if (restoreFocus) toggle.focus({preventScroll: true});
  }
  window.FamilyChrome = {closeNavigation: () => setNavigation(false)};
  toggle.addEventListener('click', () => {
    setNavigation(!opened);
    if (opened) navigation.querySelector('a').focus({preventScroll: true});
  });
  scrim.addEventListener('click', () => setNavigation(false, true));
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNavigation(false)));
  mobile.addEventListener('change', () => setNavigation(false));
  document.addEventListener('keydown', event => {
    if (!opened) return;
    if (event.key === 'Escape') {event.preventDefault(); setNavigation(false, true); return;}
    if (event.key !== 'Tab') return;
    const items = [...header.querySelectorAll('a,button')].filter(el => !el.disabled && el.getClientRects().length && !el.closest('[inert]'));
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  document.addEventListener('focusin', event => {
    if (opened && !header.contains(event.target)) setNavigation(false);
  });
  setNavigation(false);
})();
