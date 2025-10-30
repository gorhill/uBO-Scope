## uBO Scope

| Browser | Install from ... | Browser | Install from ... |
| --- | --- | --- | --- |
| <img src="https://github.com/user-attachments/assets/d5033882-0c94-424f-9e8b-e00ed832acf7" alt="Get uBO Lite for Chromium"> | <a href="https://chromewebstore.google.com/detail/ubo-scope/bbdpgcaljkaaigfcomhidmneffjjjfgp">Chrome Web Store</a> | <img src="https://github.com/user-attachments/assets/8a33b8ba-57ee-4a54-a83c-7d21f9b2dafb" alt="Get uBlock Origin Lite for Firefox"> | <a href="https://addons.mozilla.org/firefox/addon/ubo-scope/">Firefox Add-ons</a> |

## Purpose

A simple extension which primary purpose is to passively observe and reveal all the connections -- attempted or successful -- to remote servers.

**Important:** The badge count on the toolbar icon reports **the number of distinct third-party remote servers for which there was a connection**. Therefore a lower count is more desirable than a higher one.

Keep in mind that not all third party remote servers are necessarily to be avoided, though the number of legitimate third parties are usually low count, typically CDNs.

The extension uses `webRequest` listeners to report what exactly happened to network requests made by webpages.

This extension is able to report the outcome of network requests regardless of which content blocker is in effect, including content blocking through DNS servers, as long as the browser reports network requests through its `webRequest` API. Network requests made outside the reach of the `webRequest` API cannot be reported by this extension.

uBO Scope is also useful in debunking the following myths:

---

### _"This content blocker reports blocking more than this other one, therefore it is better"_

The block count on a toolbar icon badge should never be used to assess the reliability of a content blocker. Ultimately what matters is the number of distinct 3rd-party remote servers from which resources were fetched, i.e. network requests which were _not_ blocked.

It is possible and not uncommon that a higher block count correlates with your browser fetching resources from _more_ 3rd-party remote servers, ultimately meaning a content blocker with high block count may in fact block less since it may be found to allow connections to more distinct remote servers.


---

### _"This 'ad blocker test' webpage shows reliable results"_

These "ad blocker test" webpages should be completely avoided. They are not equipped to properly evaluate the reliability of extension-based content blockers.

Many extension-based content blockers use tricks to be stealthy when doing their work, in order to avoid webpage breakage or detection, and webpages can't see this.

Additionally these 'ad blocker test' webpages make unrealistic network requests to remote servers which are not used in the real world by any website, these are completely fabricated scenarios which should not be used as benchmark.

---

uBO Scope can also be a tool useful to filter list maintainers, especially on devices where access to browser tools is limited.

This is a first version, and I do not intend to update this extension often. However I will be adding features which are especially helpful to filter list maintainers. In the short term I plan to add access to more details regarding the observed network requests.

This repo has been re-purposed from an earlier, more elaborate version of an extension with the same name. You can find the switch to the new extension at this commit: <https://github.com/gorhill/uBO-Scope/tree/0.1.12>
