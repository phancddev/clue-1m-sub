import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { appState, videoFileName } from '../../lib/globals';

export const GET: APIRoute = async ({ url }) => {
  const kind = url.searchParams.get('f') === 'webm' ? 'webm' : 'mp4';
  const name = videoFileName(appState().video, kind);
  if (!name) return new Response('Not Found', { status: 404 });

  const dataDir = process.env.DATA_DIR || path.resolve('data');
  const file = path.join(dataDir, 'videos', path.basename(name));
  if (!fs.existsSync(file)) return new Response('Not Found', { status: 404 });

  const buf = fs.readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      'content-type': kind === 'webm' ? 'video/webm' : 'video/mp4',
      'content-length': String(buf.length),
      'content-disposition': `attachment; filename="${path.basename(file)}"`,
    },
  });
};
