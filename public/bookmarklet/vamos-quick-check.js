(function() {
  var VAMOS_APP_URL = 'APP_URL_PLACEHOLDER';

  function showLoading(msg) {
    var el = document.getElementById('vamos-loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vamos-loading';
      el.style.cssText = 'position:fixed;top:20px;right:20px;background:#7C3AED;color:white;padding:16px 20px;border-radius:8px;z-index:999999;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }

  function hideLoading() {
    var el = document.getElementById('vamos-loading');
    if (el) setTimeout(function() { el.remove(); }, 2000);
  }

  function sendData(data) {
    var json = JSON.stringify(data);
    var base64 = btoa(unescape(encodeURIComponent(json)));
    var urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.open(VAMOS_APP_URL + '/dashboard/sourcing?data=' + urlSafe, '_blank');
  }

  function getText(sel) {
    var el = document.querySelector(sel);
    return el ? (el.textContent || '').trim() : '';
  }

  function parseLinkedIn() {
    showLoading('LinkedIn: Збираю дані...');
    var name = '';
    var h1 = document.querySelector('main h1') || document.querySelector('h1');
    if (h1) {
      var txt = (h1.textContent || '').trim();
      if (txt && txt.length > 1 && txt.length < 100 && txt.indexOf('LinkedIn') === -1) name = txt;
    }
    if (!name) {
      var titleMatch = document.title.match(/^\(?[\d]*\)?\s*(.+?)\s*[|\-–]/);
      if (titleMatch) name = titleMatch[1].trim();
    }
    if (!name) name = 'Unknown';
    var headline = getText('.text-body-medium') || '';
    var loc = '';
    var locEls = document.querySelectorAll('.text-body-small');
    for (var i = 0; i < locEls.length; i++) {
      var t = (locEls[i].textContent || '').trim();
      if (t && (t.indexOf(',') > -1 || t.indexOf('Ukraine') > -1 || t.indexOf('Україна') > -1 || t.indexOf('Area') > -1 || t.indexOf('Region') > -1) && t.indexOf('degree') === -1 && t.indexOf('followers') === -1) {
        loc = t;
        break;
      }
    }
    var about = '';
    var aboutSection = document.querySelector('section:has(#about)') || document.querySelector('[data-generated-suggestion-target*="about"]');
    if (aboutSection) {
      var aboutDiv = aboutSection.querySelector('.inline-show-more-text') || aboutSection.querySelector('span[aria-hidden="true"]');
      if (aboutDiv) about = (aboutDiv.textContent || '').trim();
    }
    if (!about) {
      var sections = document.querySelectorAll('section');
      for (var i = 0; i < sections.length; i++) {
        var heading = sections[i].querySelector('h2');
        if (heading && (heading.textContent || '').indexOf('About') > -1) {
          var span = sections[i].querySelector('span[aria-hidden="true"]');
          if (span) about = (span.textContent || '').trim();
          break;
        }
      }
    }
    var skills = [];
    var skillSection = null;
    var sections = document.querySelectorAll('section');
    for (var i = 0; i < sections.length; i++) {
      var heading = sections[i].querySelector('h2');
      if (heading && (heading.textContent || '').indexOf('Skills') > -1) {
        skillSection = sections[i];
        break;
      }
    }
    if (skillSection) {
      var skillEls = skillSection.querySelectorAll('span[aria-hidden="true"]');
      for (var i = 0; i < skillEls.length; i++) {
        var s = (skillEls[i].textContent || '').trim();
        if (s && s.length > 1 && s.length < 50 && skills.indexOf(s) === -1 && s.indexOf('Show all') === -1 && s.indexOf('endorsed') === -1) skills.push(s);
      }
    }
    var experiences = [];
    var expSection = null;
    for (var i = 0; i < sections.length; i++) {
      var heading = sections[i].querySelector('h2');
      if (heading && (heading.textContent || '').indexOf('Experience') > -1) {
        expSection = sections[i];
        break;
      }
    }
    if (expSection) {
      var expItems = expSection.querySelectorAll('li');
      for (var i = 0; i < Math.min(expItems.length, 5); i++) {
        var item = expItems[i];
        var spans = item.querySelectorAll('span[aria-hidden="true"]');
        if (spans.length >= 2) {
          experiences.push({ title: (spans[0].textContent || '').trim(), company: (spans[1].textContent || '').trim() });
        }
      }
    }
    showLoading('LinkedIn: Готово!');
    setTimeout(function() {
      sendData({ platform: 'linkedin', url: window.location.href, name: name, headline: headline, location: loc, skills: skills.slice(0, 15), experiences: experiences, about: about.substring(0, 500), timestamp: new Date().toISOString() });
      hideLoading();
    }, 500);
  }

  function parseGitHub() {
    showLoading('GitHub: Збираю дані...');
    var username = window.location.pathname.split('/')[1] || '';
    var name = getText('[itemprop="name"]') || getText('.vcard-fullname') || getText('.p-name') || username;
    var bio = getText('[data-bio-text]') || getText('.user-profile-bio') || getText('.p-note') || '';
    var loc = getText('[itemprop="homeLocation"]') || getText('.p-label') || '';
    var email = getText('[itemprop="email"] a') || '';
    var company = getText('[itemprop="worksFor"]') || getText('.p-org') || '';
    var skills = [];
    var langEls = document.querySelectorAll('[itemprop="programmingLanguage"], .repo-language-color + span');
    for (var i = 0; i < langEls.length; i++) {
      var l = (langEls[i].textContent || '').trim();
      if (l && skills.indexOf(l) === -1) skills.push(l);
    }
    var repoCount = getText('a[href$="tab=repositories"] span') || getText('.Counter') || '';
    showLoading('GitHub: Готово!');
    setTimeout(function() {
      sendData({ platform: 'github', url: window.location.href, username: username, name: name, bio: bio, location: loc, email: email, company: company, skills: skills, repo_count: repoCount, timestamp: new Date().toISOString() });
      hideLoading();
    }, 500);
  }

  function parseDOU() {
    showLoading('DOU: Збираю дані...');
    var name = getText('.g-h2') || getText('h1') || 'Unknown';
    var position = getText('.profile-name + .b-typo') || getText('.b-typo') || '';
    var loc = '';
    var locEl = document.querySelector('.icon-location');
    if (locEl && locEl.parentElement) loc = (locEl.parentElement.textContent || '').trim();
    var skills = [];
    var skillEls = document.querySelectorAll('.profile-skills .tag, .tag');
    for (var i = 0; i < skillEls.length; i++) {
      var s = (skillEls[i].textContent || '').trim();
      if (s && skills.indexOf(s) === -1) skills.push(s);
    }
    var about = getText('.profile-about') || '';
    var expYears = null;
    var expMatch = document.body.innerText.match(/(\d+)\s*(років|роки|рік|years?)/i);
    if (expMatch) expYears = parseInt(expMatch[1]);
    showLoading('DOU: Готово!');
    setTimeout(function() {
      sendData({ platform: 'dou', url: window.location.href, name: name, position: position, location: loc, skills: skills, about: about, experience_years: expYears, timestamp: new Date().toISOString() });
      hideLoading();
    }, 500);
  }

  function parseDjinni() {
    showLoading('Djinni: Збираю дані...');
    var name = getText('.profile__name') || getText('h1') || 'Unknown';
    var position = getText('.profile__title') || '';
    var loc = getText('.profile__location') || '';
    var skills = [];
    var skillEls = document.querySelectorAll('.profile-skills .skill, .job-additional-info--item-text');
    for (var i = 0; i < skillEls.length; i++) {
      var s = (skillEls[i].textContent || '').trim();
      if (s && s.length < 30 && skills.indexOf(s) === -1) skills.push(s);
    }
    var about = getText('.profile__about') || '';
    var english = getText('.english-level') || '';
    var expYears = null;
    var expMatch = document.body.innerText.match(/(\d+)\+?\s*(років|роки|рік|years?)/i);
    if (expMatch) expYears = parseInt(expMatch[1]);
    showLoading('Djinni: Готово!');
    setTimeout(function() {
      sendData({ platform: 'djinni', url: window.location.href, name: name, position: position, location: loc, skills: skills, about: about, english_level: english, experience_years: expYears, timestamp: new Date().toISOString() });
      hideLoading();
    }, 500);
  }

  function parseWorkUA() {
    showLoading('Work.ua: Збираю дані...');
    var name = '';
    var h1 = document.querySelector('h1');
    if (h1) name = (h1.textContent || '').trim();
    if (!name) name = 'Unknown';
    var position = '';
    var h2 = document.querySelector('h2');
    if (h2) position = (h2.textContent || '').trim();
    var loc = '';
    var allText = document.querySelectorAll('main *');
    for (var i = 0; i < allText.length; i++) {
      var el = allText[i];
      if ((el.textContent || '').trim() === 'Місто проживання:') {
        var next = el.nextElementSibling;
        if (next) { loc = (next.textContent || '').trim(); break; }
      }
    }
    var skills = [];
    var headings = document.querySelectorAll('h2, h3, h4, [role="heading"]');
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if ((h.textContent || '').indexOf('Знання і навички') > -1 || (h.textContent || '').indexOf('Знання та навички') > -1) {
        var list = h.nextElementSibling;
        while (list && list.tagName !== 'UL' && list.tagName !== 'OL') {
          list = list.nextElementSibling;
        }
        if (list) {
          var items = list.querySelectorAll('li');
          for (var j = 0; j < items.length; j++) {
            var s = (items[j].textContent || '').trim();
            if (s && s.length > 1 && s.length < 50 && skills.indexOf(s) === -1) skills.push(s);
          }
        }
        break;
      }
    }
    var about = '';
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      if ((h.textContent || '').indexOf('Додаткова інформація') > -1) {
        var sibling = h.nextElementSibling;
        var texts = [];
        while (sibling && sibling.tagName !== 'H2' && sibling.tagName !== 'H3' && texts.length < 5) {
          var t = (sibling.textContent || '').trim();
          if (t && t.length > 10 && t.indexOf('Запропонувати вакансію') === -1) texts.push(t);
          sibling = sibling.nextElementSibling;
        }
        about = texts.join(' ').substring(0, 500);
        break;
      }
    }
    var expYears = null;
    var expMatch = document.body.innerText.match(/\((\d+)\s*(років|роки|рік)/i);
    if (expMatch) expYears = parseInt(expMatch[1]);
    var salary = '';
    var salaryEl = document.querySelector('b.text-black, .salary');
    if (salaryEl) salary = (salaryEl.textContent || '').trim();
    showLoading('Work.ua: Готово!');
    setTimeout(function() {
      sendData({ platform: 'workua', url: window.location.href, name: name, position: position, location: loc, skills: skills.slice(0, 25), about: about, experience_years: expYears, salary_expectations: salary, timestamp: new Date().toISOString() });
      hideLoading();
    }, 500);
  }

  var host = window.location.hostname;
  var path = window.location.href;
  try {
    if (host.indexOf('linkedin.com') > -1 && path.indexOf('/in/') > -1) {
      showLoading('LinkedIn: Чекаю завантаження...');
      setTimeout(parseLinkedIn, 1000);
    }
    else if (host.indexOf('dou.ua') > -1) { parseDOU(); }
    else if (host.indexOf('djinni.co') > -1) { parseDjinni(); }
    else if (host.indexOf('work.ua') > -1 && path.indexOf('/resumes/') > -1) { parseWorkUA(); }
    else if (host.indexOf('github.com') > -1 && window.location.pathname.split('/').filter(function(p){return p;}).length === 1) { parseGitHub(); }
    else { showLoading('Непідтримувана сторінка'); hideLoading(); }
  } catch(e) { showLoading('Помилка: ' + e.message); hideLoading(); console.error(e); }
})();
