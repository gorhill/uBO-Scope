## Preamble

The mindset of this project is as follow:

Data created on a remote server as a result of you merely connecting to that server **will be used**, including used against your own interests. The privacy policy of whatever entity who owns a remote server is completely irrelevant, if the data is created in the first place, it **will** be used.

## Purpose

To inform you about your own third-party exposure on the web pages you visit through a **third party exposure score**.

Third-party ("3rd-party") exposure is quite an important component of the more general concept of privacy exposure.

In the scope of uBO-Scope, "3rd-party" is defined as follow:

A network request to a remote server which has a different base domain name than the base domain name of the URL in the address bar is deemed "3rd-party".

A 3rd-party exposure score is derived not only from the number of distinct third parties on a web page, but also from the ubiquitousness of each of these distinct third parties.

## Status

Early development version. **DO NOT REQUEST FEATURES.**

I have found two glitches when the extension is used with Firefox:

- uBO-Scope can't see network requests which have been redirected to `data:` URIs. This is quite a crippling issue for uBO-Scope when used with content blockers which do that sort of things (uBlock Origin does). It means it will be unable to report accurately 3rd-party exposure scores. For instance, uBlock Origin redirects Google Analytics and Google Tag Manager scripts to local neutered versions, and uBO-Scope is unable to see this in Firefox. Given how Google Analytics and Google Tag Manager are ubiquitous, that will be rather important pieces of data being invisible to uBO-Scope. Hopefully this issue will be solved by Firefox developers.

- The popup panel does not always display as intended. Sometimes there are spurious scrollbars appearing, while they definitely should not appear.

## How it works

uBO-Scope does not alter network traffic, it _only_ observes it. For every network request, blocked or allowed, it will extract the base domain name. If the base domain name of the network request is 3rd-party to base domain name extracted from the URL of the web page, it will store the pair [3rd-party base domain name, 1st-party base domain name], to be used forward to compute and show your overall 3rd-party exposure score of web pages you visit in the future.

Your 3rd-party exposure score depends on your past browsing history and the tools you used (if any) which have blocked network requests, and how these tools (if any) are configured. uBO-Scope does not depend on uBlock Origin to do its job, it will work with any content blocker, or no content blocker.

When you use a content blocker, or a combination of content blockers, or any other privacy-enhancing extensions which purpose is to minimize exposure to third parties (i.e. [Decentraleyes](https://github.com/Synzvato/decentraleyes)), the missing key insights are how much they benefit you overall, and whether they meet your expectations of what they do.

Content blockers typically will show you how much they block, not how much they **didn't** block. All my blocking benchmarks have always been about all the 3rd-parties which were **not** blocked. For example, uBlock Origin's [_"Blocking mode"_](https://github.com/gorhill/uBlock/wiki/Blocking-mode).

uBO-Scope is essentially a tool to measure what these benchmarks measured, except that uBO-Scope also measures ubiquitousness of third parties, and measure according to your _own_ browsing history, so the results are completely relevant to you (unlike external benchmarks which quite probably do not match your own browsing history), and the goal is to increase awareness of your own level of 3rd-party exposure.

Hopefully this will assist you in decision-making regarding which content blocker(s) you use, and/or how you configure them.

## Privacy policy

As explained above, uBO extracts the base domain of network requests and create pairs [3rd-party base domain name, 1st-party base domain name]. Distinct pairs are stored on a day-based granularity in order to be able to compute an actual 3rd-party exposure score, and a theoritical ("averted") 3rd-party exposure score.

**All the data created by uBO-Scope never leave your browser.**

The only connections uBO-Scope make to the outside world are to fetch latest version of these two reosurces, used internally by uBO-Scope:

- <https://publicsuffix.org/list/public_suffix_list.dat>: to correctly extract base domain names.
- <https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json>: to provide metadata (ownership, category), if any, for third parties in the popup panel.

(Actually, there is no code yet in the draft version to fetch these remote resources, they are currently always loaded locally).

If you uninstall uBO-Scope, the browser will destroy its associated storage, and the data will be lost forever.

## Walkthrough

Since the primary purpose of uBO-Scope is to inform about 3rd-party exposure, it needs a browsing history to be able to do its job -- the ubiquitousness of a specific third party can only be computed according to how many distinct web sites use that specific third party.

For the purpose of this walkthrough, I created four distinct browsing profiles (using Chromium's "Person" feature), and visited the 120 [top story links of Hacker News for the past year](http://www.hntoplinks.com/year). The screenshots reflect this (short) "browsing history".

[working more on this once the project is added as a GitHub repo]
