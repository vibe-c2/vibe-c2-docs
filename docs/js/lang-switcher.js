(function () {
  'use strict';

  var LANGUAGES = [
    { locale: 'en', name: 'EN', path: '/' },
    { locale: 'uk', name: 'UK', path: '/uk/' }
  ];

  function getBasePath() {
    // Detect site base path from canonical URL or script location
    var base = '';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      try {
        var url = new URL(canonical.href);
        // Base is everything before the locale segment
        var parts = url.pathname.split('/').filter(Boolean);
        // Check if first segment is a locale
        var locales = LANGUAGES.map(function (l) { return l.locale; });
        if (parts.length > 0 && locales.indexOf(parts[0]) !== -1) {
          base = '';
        } else {
          // For GitHub Pages with repo name prefix like /vibe-c2-docs/
          // Find where the content path starts
          for (var i = 0; i < parts.length; i++) {
            if (locales.indexOf(parts[i]) !== -1) break;
            base += '/' + parts[i];
          }
        }
      } catch (e) { /* ignore */ }
    }
    return base;
  }

  function getCurrentLocale() {
    var path = window.location.pathname;
    for (var i = 0; i < LANGUAGES.length; i++) {
      var lang = LANGUAGES[i];
      if (lang.locale !== 'en') {
        // Match /base/uk/ or /uk/ pattern
        var pattern = '/' + lang.locale + '/';
        if (path.indexOf(pattern) !== -1) return lang.locale;
      }
    }
    return 'en';
  }

  function getPagePath() {
    var path = window.location.pathname;
    var base = getBasePath();

    // Strip base prefix
    if (base && path.indexOf(base) === 0) {
      path = path.substring(base.length);
    }

    // Strip locale prefix
    var current = getCurrentLocale();
    if (current !== 'en') {
      var localePrefix = '/' + current + '/';
      if (path.indexOf(localePrefix) === 0) {
        path = path.substring(localePrefix.length - 1);
      }
    }

    return path || '/';
  }

  function buildUrl(locale) {
    var base = getBasePath();
    var page = getPagePath();
    if (locale === 'en') {
      return base + page;
    }
    return base + '/' + locale + (page === '/' ? '/' : page);
  }

  function createSwitcher() {
    var current = getCurrentLocale();
    var currentLang = LANGUAGES.find(function (l) { return l.locale === current; });

    var container = document.createElement('div');
    container.className = 'lang-switcher';

    var btn = document.createElement('button');
    btn.className = 'lang-switcher__btn';
    btn.textContent = currentLang ? currentLang.name : 'EN';
    btn.setAttribute('aria-label', 'Switch language');
    btn.setAttribute('type', 'button');

    var dropdown = document.createElement('div');
    dropdown.className = 'lang-switcher__dropdown';

    LANGUAGES.forEach(function (lang) {
      var link = document.createElement('a');
      link.href = buildUrl(lang.locale);
      link.textContent = lang.name;
      link.className = 'lang-switcher__item';
      if (lang.locale === current) {
        link.classList.add('lang-switcher__item--active');
      }
      dropdown.appendChild(link);
    });

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      container.classList.toggle('lang-switcher--open');
    });

    document.addEventListener('click', function () {
      container.classList.remove('lang-switcher--open');
    });

    container.appendChild(btn);
    container.appendChild(dropdown);

    return container;
  }

  function inject() {
    // Avoid double-injection
    if (document.querySelector('.lang-switcher')) return;

    var target = document.querySelector('.wy-nav-top') ||
                 document.querySelector('[role="navigation"]') ||
                 document.body;

    var switcher = createSwitcher();
    document.body.appendChild(switcher);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
