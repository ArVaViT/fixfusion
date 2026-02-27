/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { fireEvent } = require('@testing-library/dom');

const HTML_PATH = path.resolve(__dirname, '../index.html');

/* jsdom stubs for APIs it doesn't implement */
window.scrollTo = jest.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

function loadPage() {
  document.body.innerHTML = fs.readFileSync(HTML_PATH, 'utf8');
  jest.resetModules();
  require('../script.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

/* ========== Menu ========== */

describe('Burger menu', () => {
  beforeEach(loadPage);

  test('toggles open/close classes and aria-expanded', () => {
    const burger = document.getElementById('burger-btn');
    const navList = document.getElementById('nav-list');

    fireEvent.click(burger);
    expect(navList.classList.contains('open')).toBe(true);
    expect(burger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(burger);
    expect(navList.classList.contains('open')).toBe(false);
    expect(burger.getAttribute('aria-expanded')).toBe('false');
  });

  test('closes on nav link click', () => {
    const burger = document.getElementById('burger-btn');
    const navList = document.getElementById('nav-list');
    fireEvent.click(burger);
    expect(navList.classList.contains('open')).toBe(true);

    const link = navList.querySelector('a');
    fireEvent.click(link);
    expect(navList.classList.contains('open')).toBe(false);
  });

  test('closes on Escape key', () => {
    const burger = document.getElementById('burger-btn');
    const navList = document.getElementById('nav-list');
    fireEvent.click(burger);
    expect(navList.classList.contains('open')).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(navList.classList.contains('open')).toBe(false);
  });
});

/* ========== Services accordion ========== */

describe('Services accordion', () => {
  beforeEach(loadPage);

  test('toggles grid visibility and aria-expanded', () => {
    const toggle = document.getElementById('services-toggle');
    const grid = document.getElementById('services-grid');

    fireEvent.click(toggle);
    expect(grid.classList.contains('open')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);
    expect(grid.classList.contains('open')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

/* ========== Quote form ========== */

describe('Quote form — step navigation', () => {
  beforeEach(loadPage);

  test('step 1 Next is disabled until a service is selected', () => {
    const nextBtn = document.querySelector('.form-next-btn[data-next="2"]');
    expect(nextBtn.disabled).toBe(true);

    const radio = document.querySelector('input[name="service"]');
    fireEvent.click(radio);
    expect(nextBtn.disabled).toBe(false);
  });

  test('advancing to step 2 activates correct step', () => {
    const radio = document.querySelector('input[name="service"]');
    fireEvent.click(radio);

    const nextBtn = document.querySelector('.form-next-btn[data-next="2"]');
    fireEvent.click(nextBtn);

    const step2 = document.querySelector('.form-step[data-step="2"]');
    expect(step2.classList.contains('active')).toBe(true);
  });

  test('back button returns to previous step', () => {
    const radio = document.querySelector('input[name="service"]');
    fireEvent.click(radio);
    fireEvent.click(document.querySelector('.form-next-btn[data-next="2"]'));

    const backBtn = document.querySelector('.form-back-btn[data-back="1"]');
    fireEvent.click(backBtn);

    const step1 = document.querySelector('.form-step[data-step="1"]');
    expect(step1.classList.contains('active')).toBe(true);
  });
});

/* ========== Placeholder / safety ========== */

describe('Safety', () => {
  beforeEach(loadPage);

  test('social links do not throw on click', () => {
    const links = document.querySelectorAll('.social-links a');
    links.forEach((link) => {
      expect(() => fireEvent.click(link)).not.toThrow();
    });
  });

  test('footer year is current year', () => {
    const yearEl = document.getElementById('footer-year');
    expect(yearEl.textContent).toBe(String(new Date().getFullYear()));
  });
});
