/* Настройки сайта. Меняйте пути к ресурсам и URL анкеты здесь. */
window.WEDDING_CONFIG = {
  // Вставьте URL опубликованного Google Apps Script, заканчивающийся на /exec.
  // Пошаговое подключение описано в README.html и google-apps-script/Code.gs.
  formEndpoint: 'https://script.google.com/macros/s/AKfycbyhR1bvY0CCgQjhgEyGV1mKcAmqL0AVZvqRuvat8kaBKNZsLbE-Y4az03a6erKnYihPCw/exec',

  // Музыка воспроизводится только из локального файла assets/music.mp3.
  formTimeoutMs: 45000,
  galleries: {
    women: Array.from({ length: 13 }, (_, i) => `assets/women-${String(i + 1).padStart(2, '0')}.png`),
    men: Array.from({ length: 12 }, (_, i) => `assets/men-${String(i + 1).padStart(2, '0')}.png`)
  }
};
