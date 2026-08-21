/**
 * fonts.ts — Mr.Yolk's typeface, self-hosted.
 *
 * Nunito ships from node_modules (@fontsource, OFL-1.1) rather than a CDN, so a render is
 * offline-safe and deterministic and can never silently fall back to a system face partway
 * through. A rounded face is the right one here: it matches the soft geometry of the
 * character and keeps numerals friendly at the sizes the leverage section uses them.
 */

import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
