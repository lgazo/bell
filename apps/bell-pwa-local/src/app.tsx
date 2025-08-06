import { Hono } from "hono";
import { html } from "hono/html";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";

interface SiteData {
  title: string;
  description: string;
  image: string;
  children?: any;
  clientId: string;
}
const Layout = (props: SiteData) => html`
<html>
<head>
  <meta charset="UTF-8">
  <title>${props.title}</title>
  <meta name="description" content="${props.description}">
  <head prefix="og: http://ogp.me/ns#">
  <meta property="og:type" content="article">
  <!-- More elements slow down JSX, but not template literals. -->
  <meta property="og:title" content="${props.title}">
  <meta property="og:image" content="${props.image}">

  <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@main/bundles/datastar.js"></script>
</head>
<body>
  ${props.children}
</body>
</html>
`;

const Content = (props: { siteData: SiteData; name: string }) => (
  <Layout {...props.siteData}>
    <h1>{props.siteData.clientId}</h1>
    <div
      id="toMerge"
    >
      Hello {props.name} ; {props.siteData.clientId}
    </div>
    <button data-on-click={"@post('/merge/" + props.siteData.clientId + "')"}>
      Click me
    </button>
    <button data-on-click={"@post('/repeat/" + props.siteData.clientId + "')"}>
      Repeat
    </button>
    <div id="repeat"></div>
    Listeners:
    <ul id="listeners"></ul>
    SW Clients:
    <div id="sw_clients"></div>
  </Layout>
);

const UNDEFINED_CLIENT_ID = "__NA_CLIENT_ID__";
type ClientId = string;
type BusTriggerMessage = string;
type BusListenerOpts = {
  url: string;
  clientId: ClientId;
};
type BusTrigger = (msg: BusTriggerMessage) => void;
type BusListener = {
  opts: BusListenerOpts;
  date: number;
  fn: BusTrigger;
};

const listeners: Record<ClientId, BusListener> = {};
const register = (opts: BusListenerOpts, fn: BusTrigger) => {
  console.log(`registered ${opts.url} ${opts.clientId}`, opts);
  listeners[opts.clientId] = {
    opts,
    date: Date.now(),
    fn,
  };
};
const broadcast = (msg: BusTriggerMessage) => {
  Object.entries(listeners).forEach(([clientId, listener]) => {
    console.log(
      `firing [${clientId}] ${listener.opts.url}; ${listener.opts.clientId}; ${listener.date}`,
    );
    listener.fn(msg);
  });
};

const deregister = (client_id: ClientId) => {
  if (listeners.hasOwnProperty(client_id)) {
    delete listeners[client_id];
    console.warn(`removed client listener ${client_id}`);
  }
};
export const update = (client_ids: string[]) => {
  // client_ids.forEach(deregister);
  broadcast(`client ids = ${client_ids}`);
};

export const app = new Hono({ strict: false });

app.get("/src/*", (c) => {
  console.log("c", c.req.header("clientId"));

  const props = {
    name: c.req.url,
    siteData: {
      title: "Hello <> World",
      description: "This is a description",
      image: "https://example.com/image.png",
      clientId: "" + c.req.header("clientId"),
    },
  };
  return c.html(<Content {...props} />);
});


app.post("/merge/:clientId", async (c) => {
  const reader = await ServerSentEventGenerator.readSignals(c.req);
  const clientId: ClientId = c.req.header("clientId") || UNDEFINED_CLIENT_ID;
  console.log(`merge ${clientId}`, c);

  return ServerSentEventGenerator.stream(
    async (stream) => {
      register({ url: c.req.url, clientId }, (msg) => {
        console.log(`registered listener called ${clientId}`, stream);

        try {
          if (msg.startsWith("client ids")) {
            stream.patchElements(`<div id="sw_clients">${msg}</div>`);
          } else {
            stream.patchElements(`<div id="toMerge">fired ${msg}</div>`);
          }
        } catch (e) {
          // I dont see a way how to detect the stream was closed in the meantime
          console.warn(`enque failed ${clientId}`, e);
          deregister(clientId);
        }
      });

      stream.patchElements(
        `<div id="toMerge">Initial ${clientId} ${reader.signals.foo}</div>`,
      );
    },
    {
      keepalive: true,
      onAbort: (error) => {
        console.warn(`abort`, error);
      },
      onError: (error) => {
        console.error(`stream error clientId: ${clientId}`, error);
      },
    },
  );
});

app.post("/repeat/:clientId", async (c) => {
  const clientId = c.req.header("clientId");
  console.log(`repeat client id ${clientId}`, c);
  broadcast(`The day the earth collapsed ${Date.now()}`);

  return ServerSentEventGenerator.stream(
    async (stream) => {
      stream.patchElements(`<div id="repeat">repeat ${Date.now()}</div>`);
      stream.patchElements(
        `<ul id="listeners">${Object.keys(listeners).map((listener_key) => <li>{listener_key}</li>)}</ul>`,
      );
    },
    { keepalive: false },
  );
});

app.onError((err, c) => {
  const clientId = c.req.header("clientId") || UNDEFINED_CLIENT_ID;
  console.error(
    `hono error ${clientId} / ${listeners.hasOwnProperty(clientId)}`,
    { err, c },
  );

  return ServerSentEventGenerator.stream(
    async (stream) => {
      stream.patchElements(`<div id="repeat"><b>Error happend</b></div>`);
      stream.patchElements(
        `<ul id="listeners">${Object.keys(listeners).map((listener_key) => <li>{listener_key}</li>)}</ul>`,
      );
    },
    { keepalive: false },
  );
});

