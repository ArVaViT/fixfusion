/**
 * FixFusion — Main Script
 *
 * Strict, null-safe, zero global leaks.
 * Input validation, rate-limiting on form submit, XSS-safe.
 */
'use strict';

(function () {
  /* ==========================================================================
     UTILITIES
     ========================================================================== */

  /** @param {string} sel @returns {Element | null} */
  function qs(sel) { return document.querySelector(sel); }

  /** @param {string} sel @returns {NodeListOf<Element>} */
  function qsa(sel) { return document.querySelectorAll(sel); }

  /** @param {string} id @returns {HTMLElement | null} */
  function byId(id) { return document.getElementById(id); }

  /** Clamp a number between min and max. */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /** Encode HTML-special characters to prevent injection in user input. */
  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"'&]/g, function (ch) {
      switch (ch) {
        case '<':  return '&lt;';
        case '>':  return '&gt;';
        case '"':  return '&quot;';
        case "'":  return '&#39;';
        case '&':  return '&amp;';
        default:   return ch;
      }
    });
  }

  /** Simple email format check (RFC 5322 simplified). */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /** Phone: at least 7 digits among allowed chars. */
  function isValidPhone(phone) {
    var digits = phone.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }

  /* ==========================================================================
     CLEANUP REGISTRY — prevents duplicate listeners across script reloads
     ========================================================================== */

  var CLEANUP_KEY = '__fixfusion_cleanup__';

  /** Run any previous cleanup before re-initializing. */
  function runPreviousCleanup() {
    if (typeof window[CLEANUP_KEY] === 'function') {
      window[CLEANUP_KEY]();
    }
  }

  /* ==========================================================================
     DOM REFERENCES (resolved after DOMContentLoaded)
     ========================================================================== */

  var burgerBtn, navList, srvToggle, srvGrid, header, hero, scrollArrow;

  /** Shared menu-close function — set by initBurgerMenu, called by initSmoothScroll. */
  var closeMenu = null;

  /* ==========================================================================
     INITIALISATION
     ========================================================================== */

  document.addEventListener('DOMContentLoaded', function init() {
    runPreviousCleanup();

    burgerBtn   = byId('burger-btn');
    navList     = byId('nav-list');
    srvToggle   = byId('services-toggle');
    srvGrid     = byId('services-grid');
    header      = byId('site-header');
    hero        = byId('hero');
    scrollArrow = byId('scroll-arrow');

    if (!header || !hero) return;

    /* Dynamic copyright year */
    var yearEl = byId('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

    requestAnimationFrame(function () {
      hero.classList.add('loaded');
    });

    var cleanupFns = [];

    cleanupFns.push(initSmoothScroll());
    cleanupFns.push(initHeaderScroll());
    cleanupFns.push(initBurgerMenu());
    cleanupFns.push(initServicesAccordion());
    initScrollReveal();
    initCounters();
    cleanupFns.push(initHeroParallax());
    initQuoteForm();
    initReviews();

    window[CLEANUP_KEY] = function () {
      cleanupFns.forEach(function (fn) { if (fn) fn(); });
    };
  });

  /* ==========================================================================
     SMOOTH SCROLL
     ========================================================================== */

  function initSmoothScroll() {
    function handleClick(e) {
      var link = e.currentTarget;
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var target = qs(href);
      if (!target) return;
      e.preventDefault();

      var menuWasOpen = navList && navList.classList.contains('open');
      if (menuWasOpen && closeMenu) {
        closeMenu();
      }

      requestAnimationFrame(function () {
        var offset = window.innerWidth <= 768 ? 60 : 80;
        var y = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    }

    var links = qsa('a[href^="#"]');
    links.forEach(function (link) { link.addEventListener('click', handleClick); });

    return function cleanup() {
      links.forEach(function (link) { link.removeEventListener('click', handleClick); });
    };
  }

  /* ==========================================================================
     HEADER SCROLL STATE
     ========================================================================== */

  function initHeaderScroll() {
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.pageYOffset;
        if (header) header.classList.toggle('scrolled', y > 50);
        if (scrollArrow) scrollArrow.style.opacity = y > 80 ? '0' : '1';
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    return function cleanup() {
      window.removeEventListener('scroll', onScroll);
    };
  }

  /* ==========================================================================
     BURGER MENU
     ========================================================================== */

  function initBurgerMenu() {
    if (!burgerBtn || !navList) return null;

    function toggleMenu(open) {
      var isOpen = typeof open === 'boolean' ? open : !navList.classList.contains('open');
      navList.classList.toggle('open', isOpen);
      burgerBtn.setAttribute('aria-expanded', String(isOpen));

      if (isOpen) {
        var scrollY = window.pageYOffset;
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + scrollY + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
      } else {
        var savedY = parseInt(document.body.style.top || '0', 10) * -1;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        window.scrollTo(0, savedY);
      }
    }

    closeMenu = function () { toggleMenu(false); };

    function onBurgerClick() { toggleMenu(); }

    function onDocClick(e) {
      if (
        navList.classList.contains('open') &&
        !navList.contains(/** @type {Node} */ (e.target)) &&
        !burgerBtn.contains(/** @type {Node} */ (e.target))
      ) {
        toggleMenu(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape' && navList.classList.contains('open')) {
        toggleMenu(false);
        burgerBtn.focus();
      }
    }

    burgerBtn.addEventListener('click', onBurgerClick);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);

    return function cleanup() {
      burgerBtn.removeEventListener('click', onBurgerClick);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
      closeMenu = null;
    };
  }

  /* ==========================================================================
     SERVICES ACCORDION (MOBILE)
     ========================================================================== */

  function initServicesAccordion() {
    if (!srvToggle || !srvGrid) return null;

    function onToggle() {
      var opened = srvGrid.classList.toggle('open');
      srvToggle.setAttribute('aria-expanded', String(opened));
      srvToggle.innerHTML = opened ? 'Hide Services &#x25B2;' : 'Show Services &#x25BC;';
    }

    srvToggle.addEventListener('click', onToggle);

    return function cleanup() {
      srvToggle.removeEventListener('click', onToggle);
    };
  }

  /* ==========================================================================
     SCROLL REVEAL (IntersectionObserver)
     ========================================================================== */

  function initScrollReveal() {
    var els = qsa('.reveal,.reveal-left,.reveal-right,.reveal-scale');

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    els.forEach(function (el) { observer.observe(el); });
  }

  /* ==========================================================================
     COUNTER ANIMATION
     ========================================================================== */

  function initCounters() {
    var counters = qsa('[data-count]');
    if (!counters.length) return;

    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = (el.getAttribute('data-count') || '0') + '+';
      });
      return;
    }

    var counterObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(/** @type {HTMLElement} */ (entry.target));
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (c) { counterObs.observe(c); });
  }

  /** @param {HTMLElement} el */
  function animateCounter(el) {
    var end = parseInt(el.getAttribute('data-count') || '0', 10);
    if (isNaN(end) || end <= 0) { el.textContent = '0+'; return; }
    var duration = 1800;
    var startTime = performance.now();

    function step(now) {
      var progress = clamp((now - startTime) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * end) + '+';
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = end + '+';
      }
    }

    requestAnimationFrame(step);
  }

  /* ==========================================================================
     HERO PARALLAX (desktop pointer only)
     ========================================================================== */

  function initHeroParallax() {
    var heroLogo = qs('.hero-logo');
    if (!heroLogo || !hero) return null;

    if (typeof window.matchMedia !== 'function') return null;
    var mq = window.matchMedia('(hover: hover) and (min-width: 769px)');
    if (!mq.matches) return null;

    function onMove(e) {
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      heroLogo.style.transform =
        'translate(' + (x * 10).toFixed(1) + 'px, ' + (y * 6).toFixed(1) + 'px)';
    }

    function onLeave() {
      heroLogo.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      heroLogo.style.transform = 'translate(0, 0)';
      setTimeout(function () { heroLogo.style.transition = ''; }, 500);
    }

    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);

    return function cleanup() {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
    };
  }

  /* ==========================================================================
     MULTI-STEP QUOTE FORM
     ========================================================================== */

  var lastSubmitTime = 0;
  var SUBMIT_COOLDOWN_MS = 5000;

  function initQuoteForm() {
    var quoteForm = /** @type {HTMLFormElement | null} */ (byId('quote-form'));
    if (!quoteForm) return;

    var steps    = quoteForm.querySelectorAll('.form-step');
    var dots     = quoteForm.querySelectorAll('.step-dot');
    var lines    = quoteForm.querySelectorAll('.step-line');
    var nextBtns = quoteForm.querySelectorAll('.form-next-btn');
    var backBtns = quoteForm.querySelectorAll('.form-back-btn');
    var successEl = qs('.form-success');
    var stepsBar  = qs('.form-steps');
    var currentStep = 1;

    /* ---- Navigate to step N ---- */
    function goToStep(n) {
      if (n < 1 || n > steps.length) return;

      steps.forEach(function (s) { s.classList.remove('active'); });
      var target = quoteForm.querySelector('.form-step[data-step="' + n + '"]');
      if (target) target.classList.add('active');

      dots.forEach(function (d) {
        var ds = parseInt(d.getAttribute('data-step') || '0', 10);
        d.classList.remove('active', 'done');
        if (ds === n)      d.classList.add('active');
        else if (ds < n)   d.classList.add('done');
      });

      lines.forEach(function (line, i) {
        line.classList.toggle('filled', i < n - 1);
      });

      if (stepsBar) stepsBar.setAttribute('aria-valuenow', String(n));
      currentStep = n;
    }

    /* ---- Step 1: enable Next after service pick ---- */
    var serviceRadios = quoteForm.querySelectorAll('input[name="service"]');
    var step1Next = quoteForm.querySelector('.form-next-btn[data-next="2"]');

    serviceRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (step1Next) step1Next.disabled = false;
      });
    });

    /* ---- Step 2 validation ---- */
    function validateStep2() {
      var sqft     = /** @type {HTMLSelectElement} */ (byId('sqft'));
      var timeline = /** @type {HTMLSelectElement} */ (byId('timeline'));
      var budget   = /** @type {HTMLSelectElement} */ (byId('budget'));
      var valid = true;

      [sqft, timeline, budget].forEach(function (sel) {
        if (!sel) return;
        var group = sel.closest('.form-group');
        if (!sel.value) {
          if (group) group.classList.add('has-error');
          valid = false;
        } else {
          if (group) group.classList.remove('has-error');
        }
      });

      return valid;
    }

    /* ---- Step 3 validation ---- */
    function validateStep3() {
      var nameInput  = /** @type {HTMLInputElement} */ (byId('fname'));
      var phoneInput = /** @type {HTMLInputElement} */ (byId('phone'));
      var emailInput = /** @type {HTMLInputElement} */ (byId('email'));
      var valid = true;

      if (nameInput) {
        var nameVal = nameInput.value.trim();
        var nameGroup = nameInput.closest('.form-group');
        if (nameVal.length < 2 || nameVal.length > 100) {
          if (nameGroup) nameGroup.classList.add('has-error');
          valid = false;
        } else {
          if (nameGroup) nameGroup.classList.remove('has-error');
        }
      }

      if (phoneInput) {
        var phoneGroup = phoneInput.closest('.form-group');
        if (!isValidPhone(phoneInput.value)) {
          if (phoneGroup) phoneGroup.classList.add('has-error');
          valid = false;
        } else {
          if (phoneGroup) phoneGroup.classList.remove('has-error');
        }
      }

      if (emailInput) {
        var emailGroup = emailInput.closest('.form-group');
        if (!isValidEmail(emailInput.value)) {
          if (emailGroup) emailGroup.classList.add('has-error');
          valid = false;
        } else {
          if (emailGroup) emailGroup.classList.remove('has-error');
        }
      }

      return valid;
    }

    /* ---- Clear error on input ---- */
    quoteForm.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        var group = field.closest('.form-group');
        if (group) group.classList.remove('has-error');
      });
    });

    /* ---- Next / Back buttons ---- */
    nextBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        var nextStep = parseInt(btn.getAttribute('data-next') || '0', 10);
        if (currentStep === 2 && !validateStep2()) return;
        goToStep(nextStep);
      });
    });

    backBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        goToStep(parseInt(btn.getAttribute('data-back') || '1', 10));
      });
    });

    /* ---- Submit ---- */
    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!validateStep3()) return;

      var now = Date.now();
      if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
        showFormError('Please wait a few seconds before submitting again.');
        return;
      }
      lastSubmitTime = now;

      var botField = quoteForm.querySelector('input[name="botcheck"]');
      if (botField && /** @type {HTMLInputElement} */ (botField).value) return;

      var submitBtn = /** @type {HTMLButtonElement | null} */ (qs('.form-submit-btn'));
      var btnText   = submitBtn ? submitBtn.querySelector('.btn-text') : null;
      var btnLoad   = submitBtn ? submitBtn.querySelector('.btn-loading') : null;

      if (btnText)   btnText.hidden = true;
      if (btnLoad)   btnLoad.hidden = false;
      if (submitBtn) submitBtn.disabled = true;

      var formData = new FormData(quoteForm);

      ['name', 'phone', 'email', 'project_address', 'project_description'].forEach(function (key) {
        var val = formData.get(key);
        if (typeof val === 'string') {
          formData.set(key, sanitize(val.trim()));
        }
      });

      fetch(quoteForm.action, { method: 'POST', body: formData })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.success) {
            steps.forEach(function (s) { s.classList.remove('active'); });
            if (stepsBar)  stepsBar.hidden = true;
            if (successEl) successEl.hidden = false;
          } else {
            resetSubmitButton(submitBtn, btnText, btnLoad);
            showFormError('Something went wrong. Please try calling us directly at +1 (417) 470-9888.');
          }
        })
        .catch(function () {
          resetSubmitButton(submitBtn, btnText, btnLoad);
          showFormError('Network error. Please try calling us directly at +1 (417) 470-9888.');
        });
    });
  }

  /** Reset the submit button after an error. */
  function resetSubmitButton(btn, text, loader) {
    if (text)   text.hidden = false;
    if (loader) loader.hidden = true;
    if (btn)    btn.disabled = false;
  }

  /** Show an error message to the user. */
  function showFormError(msg) {
    window.alert(msg);
  }

  /* ==========================================================================
     GOOGLE REVIEWS
     ========================================================================== */

  function initReviews() {
    var track = byId('reviews-track');
    var loading = byId('reviews-loading');
    var summary = byId('reviews-summary');
    var starsEl = byId('reviews-stars');
    var ratingText = byId('reviews-rating-text');

    if (!track || typeof fetch !== 'function') return;

    fetch('/api/reviews')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (loading) loading.remove();

        if (!data.reviews || data.reviews.length === 0) {
          var section = byId('reviews');
          if (section) section.style.display = 'none';
          var navLink = document.querySelector('a[href="#reviews"]');
          if (navLink && navLink.parentElement) navLink.parentElement.style.display = 'none';
          return;
        }

        if (summary && starsEl && ratingText && data.rating) {
          summary.hidden = false;
          starsEl.innerHTML = renderStars(data.rating);
          ratingText.textContent =
            data.rating.toFixed(1) + ' out of 5 — ' + data.totalReviews + ' reviews on Google';
        }

        var html = '';
        data.reviews.forEach(function (review) {
          html += buildReviewCard(review);
        });
        track.innerHTML = html;
      })
      .catch(function () {
        if (loading) {
          loading.textContent = 'Could not load reviews.';
        }
      });
  }

  function renderStars(rating) {
    var full = Math.floor(rating);
    var half = rating - full >= 0.25 && rating - full < 0.75 ? 1 : 0;
    var empty = 5 - full - half;
    if (rating - Math.floor(rating) >= 0.75) { full++; empty = 5 - full; half = 0; }
    var s = '';
    for (var i = 0; i < full; i++) s += '&#9733;';
    if (half) s += '&#9734;';
    for (var j = 0; j < empty; j++) s += '&#9734;';
    return s;
  }

  function buildReviewCard(review) {
    var stars = '';
    for (var i = 0; i < review.rating; i++) stars += '&#9733;';
    for (var j = review.rating; j < 5; j++) stars += '&#9734;';

    var avatarHtml = review.authorPhoto
      ? '<img src="' + sanitize(review.authorPhoto) + '" alt="" class="review-avatar" width="40" height="40" loading="lazy" />'
      : '<div class="review-avatar-placeholder">' + sanitize(review.author.charAt(0).toUpperCase()) + '</div>';

    var text = review.text ? sanitize(review.text) : '';

    return '<div class="review-card">' +
      '<div class="review-header">' +
        avatarHtml +
        '<div class="review-meta">' +
          '<div class="review-author">' + sanitize(review.author) + '</div>' +
          '<div class="review-time">' + sanitize(review.time) + '</div>' +
        '</div>' +
        '<svg class="review-google-icon" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>' +
          '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>' +
          '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>' +
          '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="review-stars" aria-label="' + review.rating + ' out of 5 stars">' + stars + '</div>' +
      (text ? '<p class="review-text">' + text + '</p>' : '') +
    '</div>';
  }

})();
