/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
const { fireEvent } = require('@testing-library/dom');

describe('menu interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    jest.resetModules();
    require('../script.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('placeholder links do not throw errors', () => {
    const placeholder = document.querySelector('.social-links a[href="#"]');
    expect(() => fireEvent.click(placeholder)).not.toThrow();
  });

  test('burger button toggles menu classes', () => {
    const burger = document.getElementById('burger-btn');
    const navList = document.querySelector('.nav-list');
    fireEvent.click(burger);
    expect(burger.classList.contains('active')).toBe(true);
    expect(navList.classList.contains('open')).toBe(true);
    fireEvent.click(burger);
    expect(burger.classList.contains('active')).toBe(false);
    expect(navList.classList.contains('open')).toBe(false);
  });
});
