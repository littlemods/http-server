import { Handler } from './server.ts';
import { MIME_TYPES } from './constants.ts';

import { HttpResponse } from './event.ts';

export const file = async (path: string): Promise<HttpResponse> => {
  path = path.replace(/\/\.\//g, '/');

  const base = path[0] === '/' ? '' : Deno.cwd();
  const file = await fetch(`file://${ base }/${ path }`).then(file => file.body).catch(() => null);
  const type = MIME_TYPES.get(path.split('.').pop() ?? 'txt') ?? 'text/plain';

  return file
    ? { body: file, headers: { 'content-type': type } }
    : { status: 404 };
};

export const files = (path: string, root: string): Handler => {
  path = path.replace(/(?<!\\)\*.*/, '');

  return async ({ href, respond }) => {
    const pathname = new URL(href).pathname;

    
    const base = path.split('/').filter((item) => item != '*' && item != '');
    const rest = pathname.replace(/^\//, '').split('/').filter((_, index) => index >= base.length);

    const source = `${ root.replace(/\/$/, '') }/${ [ ...rest ].join('/') }`;

    respond(await file(source));
  };
};