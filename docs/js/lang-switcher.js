(function () {
  'use strict';

  var LANGUAGES = [
    { locale: 'en', name: 'EN' },
    { locale: 'uk', name: 'UA' }
  ];

  // Capture script src at parse time (before DOMContentLoaded)
  var scriptSrc = (document.currentScript || {}).src || '';

  function getBasePath() {
    // Derive base from this script's resolved URL.
    // MkDocs references it as <base>/js/lang-switcher.js with relative paths,
    // so the browser resolves it to the correct absolute URL regardless of page depth.
    if (scriptSrc) {
      try {
        var url = new URL(scriptSrc);
        var idx = url.pathname.indexOf('/js/lang-switcher.js');
        if (idx !== -1) {
          return url.pathname.substring(0, idx);
        }
      } catch (e) { /* ignore */ }
    }
    return '';
  }

  var BASE = getBasePath();
  var LOCALES = LANGUAGES.map(function (l) { return l.locale; });

  function getCurrentLocale() {
    var path = window.location.pathname;
    var afterBase = BASE ? path.substring(BASE.length) : path;
    for (var i = 0; i < LOCALES.length; i++) {
      if (LOCALES[i] !== 'en') {
        var prefix = '/' + LOCALES[i] + '/';
        if (afterBase.indexOf(prefix) === 0) return LOCALES[i];
      }
    }
    return 'en';
  }

  function getPagePath() {
    var path = window.location.pathname;
    // Strip base prefix
    if (BASE) path = path.substring(BASE.length);
    // Strip locale prefix
    var current = getCurrentLocale();
    if (current !== 'en') {
      path = path.substring(('/' + current).length);
    }
    return path || '/';
  }

  function buildUrl(locale) {
    var page = getPagePath();
    if (locale === 'en') {
      return BASE + page;
    }
    return BASE + '/' + locale + (page === '/' ? '/' : page);
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
