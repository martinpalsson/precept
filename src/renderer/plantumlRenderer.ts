/**
 * PlantUML renderer
 *
 * Renders PlantUML source to SVG using either a local PlantUML installation
 * or a remote PlantUML server. Gracefully degrades to a code block if neither
 * is available.
 */

import { execFile } from 'child_process';
import * as https from 'https';
import * as http from 'http';
import * as zlib from 'zlib';

export interface PlantUmlConfig {
  mode: 'local' | 'server';
  command: string;   // e.g. 'plantuml' or '/usr/bin/plantuml'
  server: string;    // e.g. 'https://www.plantuml.com/plantuml/svg/'
}

const DEFAULT_CONFIG: PlantUmlConfig = {
  mode: 'local',
  command: 'plantuml',
  server: 'https://www.plantuml.com/plantuml/svg/',
};

/**
 * Render PlantUML source text to SVG.
 *
 * Returns the SVG string on success, or null if rendering failed.
 */
export async function renderPlantUml(
  source: string,
  config: Partial<PlantUmlConfig> = {},
): Promise<string | null> {
  const cfg: PlantUmlConfig = { ...DEFAULT_CONFIG, ...config };

  if (cfg.mode === 'local') {
    return renderLocal(source, cfg.command);
  }
  return renderServer(source, cfg.server);
}

/**
 * Render using a local PlantUML installation via stdin/stdout pipe.
 */
function renderLocal(source: string, command: string): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const proc = execFile(
        command,
        ['-tsvg', '-pipe', '-charset', 'UTF-8'],
        { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
        (error, stdout) => {
          if (error) {
            resolve(null);
            return;
          }
          resolve(stdout || null);
        },
      );

      if (proc.stdin) {
        proc.stdin.write(source);
        proc.stdin.end();
      }
    } catch {
      resolve(null);
    }
  });
}

/**
 * Render using a remote PlantUML server.
 *
 * The PlantUML server accepts encoded diagram text appended to the base URL.
 * Encoding: deflate → custom base64 (PlantUML alphabet).
 */
function renderServer(source: string, serverUrl: string): Promise<string | null> {
  return new Promise(resolve => {
    try {
      const encoded = encodePlantUml(source);
      const url = serverUrl.endsWith('/') ? `${serverUrl}${encoded}` : `${serverUrl}/${encoded}`;

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 30_000 }, res => {
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume();
          resolve(null);
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf-8') || null);
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

// ---------------------------------------------------------------------------
// PlantUML URL encoding
// ---------------------------------------------------------------------------

/**
 * Cache of encoded PlantUML strings, keyed by source content.
 * Avoids repeated synchronous deflate compression during re-renders
 * when diagram source hasn't changed.
 */
const encodedCache = new Map<string, string>();

/**
 * Encode PlantUML source for use in a server URL.
 *
 * Algorithm: raw UTF-8 → deflate (raw, no header) → PlantUML base64.
 * Results are cached so unchanged diagrams skip the expensive deflate step.
 */
export function encodePlantUml(source: string): string {
  const cached = encodedCache.get(source);
  if (cached !== undefined) {
    return cached;
  }
  const deflated = zlib.deflateRawSync(Buffer.from(source, 'utf-8'));
  const encoded = toPlantUmlBase64(deflated);
  encodedCache.set(source, encoded);
  return encoded;
}

// PlantUML uses a custom base64 alphabet
const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function toPlantUmlBase64(data: Buffer): string {
  let result = '';
  const len = data.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = data[i];
    const b1 = i + 1 < len ? data[i + 1] : 0;
    const b2 = i + 2 < len ? data[i + 2] : 0;

    result += PLANTUML_ALPHABET[(b0 >> 2) & 0x3f];
    result += PLANTUML_ALPHABET[((b0 & 0x3) << 4) | ((b1 >> 4) & 0xf)];
    result += PLANTUML_ALPHABET[((b1 & 0xf) << 2) | ((b2 >> 6) & 0x3)];
    result += PLANTUML_ALPHABET[b2 & 0x3f];
  }

  return result;
}

/**
 * Generate an HTML fallback when PlantUML rendering is unavailable.
 */
export function plantUmlFallbackHtml(source: string): string {
  const escaped = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return [
    '<div class="precept-graphic-uml precept-plantuml-fallback">',
    '<p class="plantuml-notice"><em>PlantUML diagram (source shown — install PlantUML for rendered output)</em></p>',
    `<pre class="plantuml-source"><code>${escaped}</code></pre>`,
    '</div>',
  ].join('\n');
}
