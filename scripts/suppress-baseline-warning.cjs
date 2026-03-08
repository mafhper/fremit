process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA = 'true';
process.env.BROWSERSLIST_IGNORE_OLD_DATA = 'true';

const originalWarn = console.warn.bind(console);

console.warn = (...args) => {
  const message = args
    .map((value) => (typeof value === 'string' ? value : String(value)))
    .join(' ');

  if (message.includes('[baseline-browser-mapping]')) {
    return;
  }

  originalWarn(...args);
};
