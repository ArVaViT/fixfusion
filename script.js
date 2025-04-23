/* ========== GLOBAL REFERENCES ========== */
const burgerBtn  = document.getElementById('burger-btn');
const navList    = document.querySelector('.nav-list');
const srvToggle  = document.getElementById('services-toggle');
const srvGrid    = document.querySelector('.services-grid');

/* ========== DOM READY ========== */
document.addEventListener('DOMContentLoaded', () => {

  /* Smooth scroll */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* Hide hero arrow on scroll */
  const scrollArrow = document.getElementById('scroll-arrow');
  window.addEventListener('scroll', () => {
    scrollArrow.style.opacity = window.pageYOffset > 50 ? 0 : 1;
  });

  /* Burger toggle */
  burgerBtn.addEventListener('click', () => {
    burgerBtn.classList.toggle('active');
    navList.classList.toggle('open');
  });

  /* Services accordion */
  srvToggle.addEventListener('click', () => {
    const opened = srvGrid.classList.toggle('open');
    srvToggle.innerHTML = opened ? 'Hide Services &#x25B2;' : 'Show Services &#x25BC;';
  });
});

/* Close menu on link click */
document.querySelectorAll('.nav-list a').forEach(link => {
  link.addEventListener('click', () => {
    navList.classList.remove('open');
    burgerBtn.classList.remove('active');
  });
});

/* Close menu on outside click */
document.addEventListener('click', e => {
  if (
    navList.classList.contains('open') &&
    !navList.contains(e.target) &&
    !burgerBtn.contains(e.target)
  ) {
    navList.classList.remove('open');
    burgerBtn.classList.remove('active');
  }
});
