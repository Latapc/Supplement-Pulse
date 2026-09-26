/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "screenshot-mobile.png",
    "revision": "0268c2affdd9266dfc3eca916cc45b4f"
  }, {
    "url": "screenshot-desktop.png",
    "revision": "02dde34752cf1ab6dc8f7696591db601"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "d2d16fe46d8d0181252f566b6473866b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "33b9036b39748101903faef928ccc16f"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a13acbb2a6b6c40083393bfc9eacf030"
  }, {
    "url": "index.html",
    "revision": "2512ae4f5ca39edffed104646d011550"
  }, {
    "url": "icon.svg",
    "revision": "cc4f5d3a6483d308ed7b2981451e5942"
  }, {
    "url": "favicon.ico",
    "revision": "eccecd5693de57132f17a40c58064131"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4dcf2703732bb701b5d438136f04e621"
  }, {
    "url": "assets/index-n6M8GrKr.js",
    "revision": null
  }, {
    "url": "assets/index-BheTkP2O.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4dcf2703732bb701b5d438136f04e621"
  }, {
    "url": "favicon.ico",
    "revision": "eccecd5693de57132f17a40c58064131"
  }, {
    "url": "icon.svg",
    "revision": "cc4f5d3a6483d308ed7b2981451e5942"
  }, {
    "url": "pwa-192x192.png",
    "revision": "a13acbb2a6b6c40083393bfc9eacf030"
  }, {
    "url": "pwa-512x512.png",
    "revision": "33b9036b39748101903faef928ccc16f"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "d2d16fe46d8d0181252f566b6473866b"
  }, {
    "url": "manifest.json",
    "revision": "c3d574583cd2101db9ee9c73d65892f8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
