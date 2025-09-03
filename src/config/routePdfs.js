// src/config/routePdfs.js

/**
 * Resuelve la URL del PDF de una ruta.
 * Opción A (recomendada para demo TFG): PDFs locales en /public/pdfs/
 *   - L164 -> /pdfs/L164.pdf
 * Si quieres URLs externas, puedes crear un map de overrides.
 */

const OVERRIDES = {
  // '1': 'https://.../L164.pdf',          // por id
  // 'L164': 'https://.../L164.pdf',       // por código
};

export function resolveRoutePdf(route) {
  if (!route) return null;
  // 1) override explícito
  const keyId = String(route.id ?? '').trim();
  const keyCode = String(route.linea ?? '').trim().toUpperCase();
  if (OVERRIDES[keyId]) return OVERRIDES[keyId];
  if (OVERRIDES[keyCode]) return OVERRIDES[keyCode];

  // 2) por convención (PDF local)
  if (keyCode) return `/pdfs/${keyCode.replace(/\s+/g, '')}.pdf`;

  // 3) fallback
  return null;
}
