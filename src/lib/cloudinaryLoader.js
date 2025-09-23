export function cloudinaryLoader({ src, width, quality }) {
  try {
    if (!src) return src;
    const q = quality || 'auto';
    if (!src.startsWith('http')) return src;
    const u = new URL(src);
    if (u.hostname !== 'res.cloudinary.com') return src;
    const parts = u.pathname.split('/upload/');
    if (parts.length !== 2) return src;
    const before = parts[0];
    const after = parts[1];
    // Si ya hay transformaciones (contiene una coma o empieza por v<version>/), no duplicamos, solo forzamos f_auto,q_ y w
    // Detectar si 'after' comienza con algo que parece transformación (letras y comas sin slash de versión)
    const afterParts = after.split('/');
    const firstSeg = afterParts[0] || '';
    const hasTransforms = /[a-zA-Z0-9_,]/.test(firstSeg) && !firstSeg.startsWith('v') && firstSeg.includes(',');
    const baseTransforms = `f_auto,q_${q},c_fill,g_auto,w_${width||64}`;
    let newPath;
    if (hasTransforms) {
      // ya hay transformaciones: las anteponemos de forma segura
      newPath = `${before}/upload/${baseTransforms}/${after}`;
    } else {
      newPath = `${before}/upload/${baseTransforms}/${after}`;
    }
    // Conservar querystring y hash originales si existen
    const search = u.search || '';
    const hash = u.hash || '';
    return `${u.origin}${newPath}${search}${hash}`;
  } catch {
    return src;
  }
}

export function cloudinaryUrl(src, { width, quality = 'auto', crop = 'fit', gravity = 'auto' } = {}) {
  try {
    if (!src || !src.startsWith('http')) return src;
    const u = new URL(src);
    if (u.hostname !== 'res.cloudinary.com') return src;
    const parts = u.pathname.split('/upload/');
    if (parts.length !== 2) return src;
    const before = parts[0];
    const after = parts[1];
    const w = width ? `,w_${width}` : '';
    const transform = `f_auto,q_${quality},c_${crop},g_${gravity}${w}`;
    const newPath = `${before}/upload/${transform}/${after}`;
    // Conservar querystring y hash originales si existen
    const search = u.search || '';
    const hash = u.hash || '';
    return `${u.origin}${newPath}${search}${hash}`;
  } catch {
    return src;
  }
}
