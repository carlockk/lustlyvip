export default function ThemeHydrator() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var legacyKey = 'lustly_theme';
    var key = 'theme';
    var stored = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    var isDark = stored ? stored === 'dark'
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = isDark ? 'dark' : 'light';
    if (stored !== theme) {
      try { localStorage.setItem(key, theme); localStorage.setItem(legacyKey, theme); } catch (e) {}
    }
    document.documentElement.dataset.theme = theme;
    document.body && (document.body.dataset.theme = theme);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`}}
    />
  );
}
