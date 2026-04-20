declare module "bittorrent-tracker" {
  import type { Server as HttpServer } from "node:http";

  interface TrackerServerOptions {
    http?: boolean | object;
    udp?: boolean | object;
    ws?: boolean | object;
    stats?: boolean;
    trustProxy?: boolean;
    interval?: number;
    filter?: (
      infoHash: string,
      params: { peer_id: string; [key: string]: unknown },
      cb: (err?: Error) => void
    ) => void;
  }

  class Server {
    http: HttpServer | null;
    ws: unknown;
    listening: boolean;
    destroyed: boolean;
    torrents: Record<string, unknown>;

    constructor(opts?: TrackerServerOptions);
    listen(port: number, hostname?: string, cb?: () => void): void;
    listen(port: number, cb?: () => void): void;
    close(cb?: () => void): void;
    on(event: string, fn: (...args: any[]) => void): void;
  }

  export { Server };
}

declare module "webtorrent" {
  class WebTorrent {
    peerId: string;
    on(event: string, fn: (...args: any[]) => void): void;
    add(torrentId: any, opts?: any, cb?: (torrent: any) => void): any;
    seed(input: any, opts?: any, cb?: (torrent: any) => void): any;
    remove(torrentId: any, opts?: any, cb?: () => void): void;
    destroy(cb?: () => void): void;
  }

  export = WebTorrent;
}
