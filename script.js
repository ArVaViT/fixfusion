/* ========== GLOBAL REFERENCES ========== */
const burgerBtn  = document.getElementById('burger-btn');
const navList    = document.querySelector('.nav-list');
const srvToggle  = document.getElementById('services-toggle');
const srvGrid    = document.querySelector('.services-grid');
const header     = document.getElementById('site-header');
const hero       = document.getElementById('hero');

/* ========== DOM READY ========== */
document.addEventListener('DOMContentLoaded', () => {

  requestAnimationFrame(() => hero.classList.add('loaded'));

  /* ---- Smooth scroll ---- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offset = window.innerWidth <= 768 ? 60 : 80;
        const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  /* ---- Header scroll ---- */
  const scrollArrow = document.getElementById('scroll-arrow');

  window.addEventListener('scroll', () => {
    const y = window.pageYOffset;
    header.classList.toggle('scrolled', y > 50);
    if (scrollArrow) scrollArrow.style.opacity = y > 80 ? 0 : 1;
  }, { passive: true });

  /* ---- Burger ---- */
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

  /* ---- Scroll Reveal ---- */
  const revealEls = document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  revealEls.forEach(el => revealObs.observe(el));

  /* ---- Counter Animation ---- */
  const counters = document.querySelectorAll('[data-count]');
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObs.observe(c));

  function animateCounter(el) {
    const end = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * end) + '+';
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = end + '+';
    }
    requestAnimationFrame(step);
  }

  /* ---- Hero parallax (desktop only) ---- */
  const heroLogo = document.querySelector('.hero-logo');
  if (heroLogo && window.matchMedia('(hover: hover) and (min-width: 769px)').matches) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroLogo.style.transform = `translate(${x * 10}px, ${y * 6}px)`;
    });
    hero.addEventListener('mouseleave', () => {
      heroLogo.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      heroLogo.style.transform = 'translate(0, 0)';
      setTimeout(() => { heroLogo.style.transition = ''; }, 500);
    });
  }

  /* ===============================================
     MULTI-STEP QUOTE FORM
     =============================================== */
  const quoteForm = document.getElementById('quote-form');
  if (!quoteForm) return;

  const steps     = quoteForm.querySelectorAll('.form-step');
  const dots      = quoteForm.querySelectorAll('.step-dot');
  const lines     = quoteForm.querySelectorAll('.step-line');
  const nextBtns  = quoteForm.querySelectorAll('.form-next-btn');
  const backBtns  = quoteForm.querySelectorAll('.form-back-btn');
  const successEl = quoteForm.querySelector('.form-success');
  let currentStep = 1;

  function goToStep(n) {
    steps.forEach(s => s.classList.remove('active'));
    const target = quoteForm.querySelector(`.form-step[data-step="${n}"]`);
    if (target) target.classList.add('active');

    dots.forEach(d => {
      const ds = parseInt(d.dataset.step, 10);
      d.classList.remove('active', 'done');
      if (ds === n) d.classList.add('active');
      else if (ds < n) d.classList.add('done');
    });

    lines.forEach((line, i) => {
      line.classList.toggle('filled', i < n - 1);
    });

    currentStep = n;
  }

  /* Step 1: enable Next when a service is picked */
  const serviceRadios = quoteForm.querySelectorAll('input[name="service"]');
  const step1Next = quoteForm.querySelector('.form-next-btn[data-next="2"]');
  serviceRadios.forEach(r => {
    r.addEventListener('change', () => {
      if (step1Next) step1Next.disabled = false;
    });
  });

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next, 10);
      if (!btn.disabled) goToStep(next);
    });
  });

  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(parseInt(btn.dataset.back, 10));
    });
  });

  /* ---- Form submission ---- */
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = quoteForm.querySelector('.form-submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoad = submitBtn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoad.style.display = 'inline-flex';
    submitBtn.disabled = true;

    try {
      const formData = new FormData(quoteForm);
      const res = await fetch(quoteForm.action, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        steps.forEach(s => s.classList.remove('active'));
        quoteForm.querySelector('.form-steps').style.display = 'none';
        successEl.style.display = 'block';
      } else {
        alert('Something went wrong. Please try calling us directly at +1 (417) 470-9888.');
        btnText.style.display = 'inline';
        btnLoad.style.display = 'none';
        submitBtn.disabled = false;
      }
    } catch {
      alert('Network error. Please try calling us directly at +1 (417) 470-9888.');
      btnText.style.display = 'inline';
      btnLoad.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
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
