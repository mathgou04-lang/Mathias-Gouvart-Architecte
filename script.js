document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const mobileViewport = window.matchMedia('(max-width: 760px)');

function closeMenu({ restoreFocus = false } = {}) {
  const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.querySelector('.menu-label').textContent = 'Menu';
  header.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  if (wasOpen && restoreFocus) toggle.focus();
}

toggle.hidden = false;
toggle.addEventListener('click', () => {
  if (toggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    return;
  }
  toggle.setAttribute('aria-expanded', 'true');
  toggle.querySelector('.menu-label').textContent = 'Fermer';
  header.classList.add('is-open');
  document.body.classList.add('menu-open');
});

header.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

header.addEventListener('keydown', (event) => {
  if (toggle.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }
  if (event.key === 'Tab') {
    const first = header.querySelector('.brand');
    const last = navigation.querySelector('a:last-child');
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

mobileViewport.addEventListener('change', () => closeMenu());
document.querySelector('#year').textContent = new Date().getFullYear();
