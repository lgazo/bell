if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // navigator.serviceWorker.getRegistrations().then(function (registrations) {
    //   for (const registration of registrations) {
    //     console.log("Unregister Service Worker", registration);
    //     // registration.unregister();
    //   }
    //   // register()
    // });

    navigator.serviceWorker.register("/src/sw.ts", { type: "module" }).then(
      (registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope,
        );

        // let's force the SW
        window.location.reload();
      },
      (err) => {
        console.log("ServiceWorker registration failed: ", err);
      },
    );
  });
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Bell PWA Local</h1>
    <p>Try visiting <a href="/src/api/hello" target="_blank">/src/api/hello</a> to see the service worker in action.</p>
    <p>Try visiting <a href="/src/api/hello">/src/api/hello</a> to see the service worker in action.</p>
    <p>Try visiting <a href="/src/api/kvak">/src/api/kvak</a> to see the service worker in action.</p>
    <p>Try visiting <a href="/src/">/src/</a> to see the service worker in action.</p>
    <img src="/src/mongo web scale.jpg" />
  </div>
`;
