(function () {
  'use strict';

  var LANGUAGES = [
    { locale: 'en', name: 'EN' },
    { locale: 'uk', name: 'UA' }
  ];

  // Capture script src at parse time (before DOMContentLoaded)
  var scriptSrc = (document.currentScript || {}).src || '';

  function getBasePath() {
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
    if (BASE) path = path.substring(BASE.length);
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

  function inject() {
    if (document.querySelector('.lang-switcher')) return;

    var current = getCurrentLocale();

    // Build the other-language link
    var target = LANGUAGES.find(function (l) { return l.locale !== current; });
    if (!target) return;

    // Create a navbar <li> item matching the theme's nav structure
    var li = document.createElement('li');
    li.className = 'nav-item lang-switcher';

    var link = document.createElement('a');
    link.href = buildUrl(target.locale);
    link.className = 'nav-link';
    link.textContent = target.name;
    link.setAttribute('aria-label', 'Switch to ' + target.name);

    li.appendChild(link);

    // Insert into the right-side navbar (ms-md-auto)
    var rightNav = document.querySelector('ul.navbar-nav.ms-md-auto');
    if (rightNav) {
      rightNav.appendChild(li);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
