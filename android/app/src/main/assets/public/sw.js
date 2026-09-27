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
    "revision": "1e2d5371ca73a99d821c61c5ffc41c44"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1e2d5371ca73a99d821c61c5ffc41c44"
  }, {
    "url": "pwa-192x192.png",
    "revision": "288c7e66d3b58d86465db007b39883f7"
  }, {
    "url": "logo-glow.svg",
    "revision": "dd941efcc32480c82849f8bef5b1c2ce"
  }, {
    "url": "index.html",
    "revision": "ad3e46189bdcc900c62058180bd8680f"
  }, {
    "url": "icon.svg",
    "revision": "cc4f5d3a6483d308ed7b2981451e5942"
  }, {
    "url": "favicon.ico",
    "revision": "ddfcc274b41c09d51bace40f664b2b08"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ab48488fe2ca8c1fac88c72e8ac32be3"
  }, {
    "url": "app-logo.png",
    "revision": "1e2d5371ca73a99d821c61c5ffc41c44"
  }, {
    "url": "assets/index-DbLn6ksk.js",
    "revision": null
  }, {
    "url": "assets/index-BpXnWxGo.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ab48488fe2ca8c1fac88c72e8ac32be3"
  }, {
    "url": "favicon.ico",
    "revision": "ddfcc274b41c09d51bace40f664b2b08"
  }, {
    "url": "icon.svg",
    "revision": "cc4f5d3a6483d308ed7b2981451e5942"
  }, {
    "url": "pwa-192x192.png",
    "revision": "288c7e66d3b58d86465db007b39883f7"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1e2d5371ca73a99d821c61c5ffc41c44"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "1e2d5371ca73a99d821c61c5ffc41c44"
  }, {
    "url": "manifest.json",
    "revision": "c3d574583cd2101db9ee9c73d65892f8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
