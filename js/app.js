'use strict';

(() => {
  const config = window.WEDDING_CONFIG || {};
  const byId = id => document.getElementById(id);

  // Не блокируем приглашение, даже если ресурс не загрузился.
  const loader = byId('loader');
  loader.hidden = false;
  Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1400))
  ]).then(() => {
    loader.classList.add('is-finished');
    setTimeout(() => { loader.hidden = true; }, 260);
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add('can-reveal');
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }

  // Музыка запускается непосредственно из нажатия; повтор использует основной файл.
  const audio = byId('bg-music');
  const musicButton = byId('music-button');
  const musicLabel = byId('music-label');
  const musicStatus = byId('music-status');
  const primaryMusicSource = 'assets/music.mp3';
  let wantsMusic = false;
  let musicState = 'paused';
  let musicAttempt = 0;
  let musicTimeout;
  let needsMusicReload = false;

  function prepareMusicSource(retry = false) {
    const url = new URL(primaryMusicSource, location.href);
    // Обходим закешированный 404, если MP3 появился после первого открытия сайта.
    url.searchParams.set('music', retry ? String(Date.now()) : 'local-mp3-3');
    audio.preload = 'metadata';
    audio.src = url.href;
  }
  prepareMusicSource();

  function showMusicState() {
    const playing = musicState === 'playing';
    const pending = musicState === 'loading';
    musicButton.setAttribute('aria-pressed', String(playing));
    if (pending) musicButton.setAttribute('aria-busy', 'true');
    else musicButton.removeAttribute('aria-busy');
    musicLabel.innerHTML = playing ? 'Выключить<br>музыку' : 'Включить<br>музыку';
  }
  function failMusic(error, attempt) {
    if (attempt !== musicAttempt || !wantsMusic) return;
    clearTimeout(musicTimeout);
    wantsMusic = false;
    musicAttempt += 1;
    musicState = 'paused';
    needsMusicReload = true;
    audio.pause();
    musicStatus.textContent = error?.name === 'NotAllowedError'
      ? 'Браузер не разрешил запуск. Нажмите «Включить музыку» ещё раз или откройте приглашение в Safari.'
      : 'Не удалось запустить музыку. Проверьте интернет и нажмите кнопку ещё раз.';
    showMusicState();
  }
  function markMusicPlaying(attempt) {
    if (attempt !== musicAttempt || !wantsMusic) return;
    clearTimeout(musicTimeout);
    musicState = 'playing';
    needsMusicReload = false;
    musicStatus.textContent = '';
    showMusicState();
  }
  musicButton.addEventListener('click', () => {
    if (wantsMusic || musicState === 'playing') {
      wantsMusic = false;
      musicAttempt += 1;
      clearTimeout(musicTimeout);
      musicState = 'paused';
      audio.pause();
      musicStatus.textContent = '';
      showMusicState();
      return;
    }
    if (needsMusicReload || audio.error) {
      prepareMusicSource(true);
      audio.load();
    }
    wantsMusic = true;
    musicState = 'loading';
    const attempt = ++musicAttempt;
    musicStatus.textContent = 'Загружаем музыку…';
    showMusicState();
    musicTimeout = setTimeout(() => failMusic({ name: 'TimeoutError' }, attempt), 20000);
    try {
      audio.muted = false;
      // До play() нет await или сетевого запроса: сохраняется жест пользователя.
      const result = audio.play();
      if (result && typeof result.then === 'function') {
        result.then(() => markMusicPlaying(attempt), error => failMusic(error, attempt));
      }
    } catch (error) {
      failMusic(error, attempt);
    }
  });
  audio.addEventListener('playing', () => markMusicPlaying(musicAttempt));
  audio.addEventListener('pause', () => {
    if (musicState === 'playing') {
      wantsMusic = false;
      musicState = 'paused';
      clearTimeout(musicTimeout);
      showMusicState();
    }
  });
  audio.addEventListener('error', () => {
    if (audio.error) failMusic(audio.error, musicAttempt);
  });


  // Один нативный диалог: выбор категории, затем галерея со свайпами.
  const dialog = byId('references-dialog');
  const picker = byId('reference-picker');
  const gallery = byId('reference-gallery');
  const galleryImage = byId('gallery-image');
  const galleryDots = byId('gallery-dots');
  let activeCategory = 'women';
  let activeIndex = 0;
  let returnFocus = null;
  let touchStart = null;
  const categoryTitle = category => category === 'women' ? 'Образы для девушек' : 'Образы для мужчин';
  function openReferences(trigger) {
    returnFocus = trigger;
    showPicker();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }
  function showPicker() {
    picker.hidden = false;
    gallery.hidden = true;
    dialog.setAttribute('aria-labelledby', 'references-title');
    if (dialog.open) picker.querySelector('button').focus();
  }
  function showImage(index) {
    const images = config.galleries?.[activeCategory] || [];
    if (!images.length) return;
    activeIndex = (index + images.length) % images.length;
    galleryImage.src = images[activeIndex];
    galleryImage.alt = `${categoryTitle(activeCategory)}, образ ${activeIndex + 1} из ${images.length}`;
    byId('gallery-counter').textContent = `${activeIndex + 1} / ${images.length}`;
    Array.from(galleryDots.children).forEach((button, i) => {
      button.setAttribute('aria-current', String(i === activeIndex));
    });
    // Следующий образ загружается заранее, остальные — по мере просмотра.
    const next = new Image();
    next.src = images[(activeIndex + 1) % images.length];
  }
  function openGallery(category) {
    activeCategory = category;
    const images = config.galleries?.[category] || [];
    picker.hidden = true;
    gallery.hidden = false;
    dialog.setAttribute('aria-labelledby', 'gallery-title');
    byId('gallery-title').textContent = categoryTitle(category);
    galleryDots.replaceChildren();
    images.forEach((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Перейти к образу ${index + 1}`);
      button.addEventListener('click', () => showImage(index));
      galleryDots.append(button);
    });
    showImage(0);
    byId('gallery-back').focus();
  }
  document.querySelectorAll('[data-open-references]').forEach(button => {
    button.addEventListener('click', () => openReferences(button));
  });
  document.querySelectorAll('[data-gallery]').forEach(button => {
    button.addEventListener('click', () => openGallery(button.dataset.gallery));
  });
  byId('close-dialog').addEventListener('click', () => dialog.close());
  byId('gallery-back').addEventListener('click', showPicker);
  byId('previous-image').addEventListener('click', () => showImage(activeIndex - 1));
  byId('next-image').addEventListener('click', () => showImage(activeIndex + 1));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    returnFocus?.focus();
  });
  dialog.addEventListener('keydown', event => {
    if (gallery.hidden) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const stage = byId('gallery-stage');
  stage.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) showImage(activeIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  stage.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
  galleryImage.addEventListener('error', () => {
    byId('gallery-counter').textContent = 'Не удалось загрузить изображение. Попробуйте следующий образ.';
  });

  // Google Apps Script: обычный POST в iframe и подтверждение через postMessage.
  // Не используем fetch(no-cors), который не подтверждает сохранение ответа.
  const form = byId('rsvp-form');
  const status = byId('form-status');
  const submit = byId('submit-button');
  submit.disabled = false;
  const ownCheckbox = byId('own-drink-checkbox');
  const ownInput = byId('own-drink');
  const drinksError = byId('drinks-error');
  let inFlight = false;
  let lastFingerprint = '';
  let lastRequestId = '';
  function formMessage(text, kind = 'info') {
    status.dataset.kind = kind;
    status.textContent = text;
  }
  function updateOwnDrink() {
    byId('own-drink-wrap').hidden = !ownCheckbox.checked;
    ownInput.disabled = !ownCheckbox.checked;
    ownInput.required = ownCheckbox.checked;
  }
  ownCheckbox.addEventListener('change', updateOwnDrink);
  form.addEventListener('change', () => { drinksError.hidden = true; });
  function makeRequestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }
  function postToSheets(payload) {
    return new Promise((resolve, reject) => {
      const endpoint = config.formEndpoint;
      const frame = document.createElement('iframe');
      frame.name = `rsvp-${payload.requestId}`;
      frame.hidden = true;
      frame.title = 'Отправка ответа';
      const transportForm = document.createElement('form');
      transportForm.hidden = true;
      transportForm.method = 'POST';
      transportForm.action = endpoint;
      transportForm.target = frame.name;
      Object.entries(payload).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden'; input.name = key; input.value = String(value);
        transportForm.append(input);
      });
      let timeout;
      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        frame.remove(); transportForm.remove();
      }
      function onMessage(event) {
        const trustedOrigin = event.origin === 'https://script.google.com'
          || /^https:\/\/(?:[a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(event.origin);
        const reply = event.data;
        if (!trustedOrigin || !reply || reply.type !== 'wedding-rsvp-result' || reply.requestId !== payload.requestId) return;
        cleanup();
        if (reply.ok === true) resolve();
        else reject(new Error(reply.message || 'Не удалось сохранить ответ. Попробуйте ещё раз.'));
      }
      window.addEventListener('message', onMessage);
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Подтверждение не пришло. Проверьте интернет и попробуйте ещё раз: повторная отправка этого ответа не создаст дубликат.'));
      }, config.formTimeoutMs || 45000);
      document.body.append(frame, transportForm);
      try { transportForm.submit(); }
      catch (error) { cleanup(); reject(error); }
    });
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (inFlight) return;
    const nameInput = byId('guest-name');
    nameInput.value = nameInput.value.trim();
    ownInput.value = ownInput.value.trim();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const drinks = data.getAll('drinks');
    if (ownCheckbox.checked) drinks.push(ownInput.value);
    if (!drinks.length) {
      drinksError.hidden = false;
      form.querySelector('input[name="drinks"]').focus();
      return;
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(config.formEndpoint || '')) {
      formMessage('Отправка анкеты пока не подключена. Пожалуйста, свяжитесь с организатором по контактам ниже.', 'error');
      status.focus(); return;
    }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      formMessage('Откройте опубликованную ссылку приглашения, чтобы отправить ответ.', 'error');
      status.focus(); return;
    }
    const fingerprint = JSON.stringify([nameInput.value, data.get('attendance'), drinks]);
    if (fingerprint !== lastFingerprint) {
      lastRequestId = makeRequestId(); lastFingerprint = fingerprint;
    }
    const payload = {
      requestId: lastRequestId,
      guestName: nameInput.value,
      attendance: data.get('attendance'),
      drinks: JSON.stringify(drinks),
      website: data.get('website') || '',
      origin: location.origin
    };
    inFlight = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    formMessage('Сохраняем ваш ответ…');
    // Снимок ответа уже сделан; предотвращаем изменение полей во время записи.
    const controls = Array.from(form.querySelectorAll('input'));
    const previouslyDisabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    try {
      await postToSheets(payload);
      form.hidden = true;
      byId('form-success').hidden = false;
      byId('form-success').focus();
      formMessage('');
    } catch (error) {
      formMessage(error.message, 'error');
      status.focus();
    } finally {
      controls.forEach((control, i) => { control.disabled = previouslyDisabled[i]; });
      inFlight = false;
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
  byId('another-guest').addEventListener('click', () => {
    form.reset();
    updateOwnDrink();
    lastRequestId = ''; lastFingerprint = '';
    drinksError.hidden = true;
    byId('form-success').hidden = true;
    form.hidden = false;
    formMessage('');
    byId('guest-name').focus();
  });
})();
