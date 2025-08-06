/// <reference lib="webworker" />

import { app, update } from "./app.tsx";
import type { Hono } from "hono";

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("install", async (event) => {
  event.waitUntil(self.skipWaiting());
  const all_clients = await self.clients.matchAll({
    includeUncontrolled: true,
  });
  console.log("Service worker installed", all_clients);
  const client_ids = all_clients.map((client) => client.id);
  update(client_ids);
});

self.addEventListener("activate", async (event) => {
  event.waitUntil(self.clients.claim());
  const all_clients = await self.clients.matchAll({
    includeUncontrolled: true,
  });
  console.log("Service worker activated", all_clients);
  const client_ids = all_clients.map((client) => client.id);
  update(client_ids);
});

// } else {
//   event.respondWith(
//     caches.match(event.request).then((response) => {
//       return response || fetch(event.request);
//     })
//   );
// }

/**
 * copied and adapted from https://github.com/honojs/hono/blob/main/src/adapter/service-worker/handler.ts
 */
export type HandleOptions = {
  fetch?: typeof fetch;
};
type Handler = (evt: FetchEvent) => void;
const handle = (
  app: Hono,
  opts: HandleOptions = {
    // To use `fetch` on a Service Worker correctly, bind it to `globalThis`.
    fetch: globalThis.fetch.bind(globalThis),
  },
): Handler => {
  return (evt) => {
    const { clientId } = evt;
    const { resultingClientId } = evt;

    const additional_headers = new Headers();
    let final_client_id = resultingClientId || clientId;
    if (!final_client_id) {
      console.warn(`SW Client ID is missing. How is it possible?`, evt);
    } else {
      additional_headers.append("clientId", final_client_id);
    }

    const cloned = new Request(evt.request, {
      headers: additional_headers,
    });
    // console.debug(`handle sw client ${evt.clientId}`, {
    //   cloned,
    //   hdr: cloned.headers.get("clientId"),
    // });
    evt.respondWith(
      (async () => {
        const res = await app.fetch(cloned);
        if (opts.fetch && res.status === 404) {
          return await opts.fetch(evt.request);
        }
        return res;
      })(),
    );
  };
};

self.addEventListener("fetch", handle(app));
