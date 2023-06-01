export interface HttpResponse {
  body?: null | string | ArrayBufferLike | FormData | ReadableStream<Uint8Array>;
  headers?: Record<string, string> | Headers;
  status?: number;
}

export class HttpRequest {
  #request: Request;
  #respond: (res: Response) => void;

  readonly ip: string | null;
  readonly href: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly method: string;
  readonly referrer: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly cookies: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  
  params: Record<string, string | undefined> = {};
  route: string | null = null;

  constructor(request: Request, ip: string | null, respond: (res: Response) => void) {
    this.#request = request;
    this.#respond = respond;
    
    this.ip       = ip;
    this.href     = request.url;
    this.body     = request.body;
    this.method   = request.method;
    this.referrer = request.referrer;

    this.headers  = [ ...request.headers.entries() ].reduce((headers, [ key, value ]) => ({ ...headers, [ key ]: value }), {});
    this.query    = [ ...new URL(request.url).searchParams.entries() ].reduce((query, [ key, value ]) => ({ ...query, [ key ]: value }), {});

    this.cookies  = this.headers.cookie?.split(';').reduce((cookies, cookie) => {
      const trim = cookie.trim().toLowerCase();

      if (trim === 'secure' || trim === 'httponly') return { ...cookies, [ trim ]: true };

      const [ key, value ] = cookie.split('=');

      return { ...cookies, [ decodeURIComponent(key.trim()) ]: decodeURIComponent(value) };
    }, {}) ?? {};
  }

  respond = (response: HttpResponse): void => {
    const status  = response.status  ?? 200;
    const headers = response.headers ?? {};
    const body    = response.body    ?? null;

    response instanceof Response
      ? this.#respond(response)
      : this.#respond(new Response(body, { status, headers }));
  };

  upgrade = (): Promise<WebSocket | null> => {
    return new Promise((resolve, reject) => {
      if (this.#request.headers.get('upgrade') !== 'websocket') reject(null);

      try {
        const { socket, response } = Deno.upgradeWebSocket(this.#request);

        this.#respond(response);
        resolve(socket);
      } catch { reject(null) }
    });
  };

  redirect = (url: string) => {
    this.#respond(new Response(null, { status: 302, headers: { location: url } }));
  };
}