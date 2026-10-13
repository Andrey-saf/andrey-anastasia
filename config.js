/* Настройки сайта. Меняйте пути к ресурсам и URL анкеты здесь. */
window.WEDDING_CONFIG = {
  // Вставьте URL опубликованного Google Apps Script, заканчивающийся на /exec.
  // Пошаговое подключение описано в README.html и google-apps-script/Code.gs.
  formEndpoint: '',

  // Положите MP3 в assets/music.mp3. Исходная Dropbox-ссылка сохранена резервной.
  musicSources: [
    'assets/music.mp3',
    'https://dl.dropbox.com/scl/fi/6eydtw1dw7wtpxhj0jg79/Cant_Help_Falling_in_Love__Violin_Instrumental_.mp3'
  ],
  formTimeoutMs: 45000,
  galleries: {
    women: Array.from({ length: 13 }, (_, i) => `assets/women-${String(i + 1).padStart(2, '0')}.png`),
    men: Array.from({ length: 12 }, (_, i) => `assets/men-${String(i + 1).padStart(2, '0')}.png`)
  }
};
