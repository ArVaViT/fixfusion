/* ========== GLOBAL REFERENCES ========== */
const burgerBtn  = document.getElementById('burger-btn');
const navList    = document.querySelector('.nav-list');
const srvToggle  = document.getElementById('services-toggle');
const srvGrid    = document.querySelector('.services-grid');
const header     = document.getElementById('site-header');
const hero       = document.getElementById('hero');

/* ========== DOM READY ========== */
document.addEventListener('DOMContentLoaded', () => {

  /* ---- Hero loaded class (triggers banner zoom) ---- */
  requestAnimationFrame(() => {
    hero.classList.add('loaded');
  });

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offset = 80;
        const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  /* ---- Header scroll state ---- */
  const scrollArrow = document.getElementById('scroll-arrow');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    if (scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    if (scrollArrow) {
      scrollArrow.style.opacity = scrollY > 100 ? 0 : 1;
    }
    lastScroll = scrollY;
  }, { passive: true });

  /* ---- Burger toggle ---- */
  burgerBtn.addEventListener('click', () => {
    burgerBtn.classList.toggle('active');
    navList.classList.toggle('open');
    document.body.style.overflow = navList.classList.contains('open') ? 'hidden' : '';
  });

  /* ---- Services accordion ---- */
  srvToggle.addEventListener('click', () => {
    const opened = srvGrid.classList.toggle('open');
    srvToggle.innerHTML = opened ? 'Hide Services &#x25B2;' : 'Show Services &#x25BC;';
  });

  /* ---- Scroll Reveal (Intersection Observer) ---- */
  const revealClasses = ['.reveal', '.reveal-left', '.reveal-right', '.reveal-scale'];
  const revealEls = document.querySelectorAll(revealClasses.join(','));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(el => revealObserver.observe(el));

  /* ---- Counter Animation ---- */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  function animateCounter(el) {
    const end = parseInt(el.getAttribute('data-count'), 10);
    const duration = 2000;
    const start = performance.now();

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * end);

      el.textContent = current + (end > 50 ? '+' : '+');

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = end + '+';
      }
    }

    requestAnimationFrame(step);
  }

  /* ---- Parallax on hero (subtle, mouse-based) ---- */
  const heroLogo = document.querySelector('.hero-logo');
  if (heroLogo && window.matchMedia('(min-width: 769px)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroLogo.style.transform = `translate(${x * 12}px, ${y * 8}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      heroLogo.style.transform = 'translate(0, 0)';
      heroLogo.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => { heroLogo.style.transition = ''; }, 600);
    });
  }
});

/* ---- Close menu on link click ---- */
document.querySelectorAll('.nav-list a').forEach(link => {
  link.addEventListener('click', () => {
    navList.classList.remove('open');
    burgerBtn.classList.remove('active');
    document.body.style.overflow = '';
  });
});

/* ---- Close menu on outside click ---- */
document.addEventListener('click', e => {
  if (
    navList.classList.contains('open') &&
    !navList.contains(e.target) &&
    !burgerBtn.contains(e.target)
  ) {
    navList.classList.remove('open');
    burgerBtn.classList.remove('active');
    document.body.style.overflow = '';
  }
});
