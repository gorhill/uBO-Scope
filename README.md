website: https://github.com/Boruch-Baum/uBO-Scope

This is a fork of [Raymond Hill](https://github.com/gorhill/)'s
[uBO-Scope](https://github.com/gorhill/uBO-Scope), for the purpose of
improving its visibility for users who opt for a dark firefox theme, or
any theme for which the default font color is light. For this git
branch, *light-theme*, minor changes were made to a single file
[popup.css](./css/popup.css), which retains the original's preference
for a white background, while making the foreground colors friendly
for dark firefox themes. A second file,
[popup.css-dark-theme](./css/popup.css-dark-theme), applies a dark
theme to the add-on. In order to use the dark theme, just copy the
file over popup.css. A backup of the popup.css file has already been
created as [popup.css-light-theme](./css/popup.css-light-theme). On
the complementary git branch *dark-theme*, that step has already been taken.

## Preamble

The mindset of this project is as follow:

Data created on a remote server as a result of you merely connecting to that server **will be used**, including used against your own interests. The privacy policy of whatever entity who owns a remote server is completely irrelevant, if the data is created in the first place, it **will** be used.

## Purpose

To inform you about your own third-party exposure on the web pages you visit through a **third party exposure score**.

Important: **The lower the 3rd-party exposure score, the better.**

Third-party ("3rd-party") exposure is quite an important component of the more general concept of privacy exposure.

In the scope of uBO-Scope, "3rd-party" is defined as follow:

A network request to a remote server which has a different base domain name than the base domain name of the URL in the address bar is deemed "3rd-party".

A 3rd-party exposure score is derived not only from the number of distinct third parties on a web page, but also from the ubiquitousness of each of these distinct third parties.

The ubiquitousness of a specific 3rd party is measured according to how frequently this 3rd party is used on web pages you visit. This means the ubiquitousness of a 3rd party will be representative of your browsing history and whether the 3rd party was blocked or not on the pages you visited.

## Status

Early development version. **DO NOT REQUEST FEATURES.**

I have found two glitches when the extension is used with Firefox:

- uBO-Scope won't be able to see blocked network requests from legacy blockers if these have been enabled **before** uBO-Scope. I believe this can be addressed by installing uBO-Scope before installing legacy blockers.

- The popup panel does not always display as intended. Sometimes there are spurious scrollbars appearing, while they definitely should not appear.

## Installation

- Manual installation from [Releases page](https://github.com/gorhill/uBO-Scope/releases)
- Chrome store: <https://chrome.google.com/webstore/detail/bbdpgcaljkaaigfcomhidmneffjjjfgp/>
- Mozilla's AMO: <https://addons.mozilla.org/en-US/firefox/addon/ubo-scope/>

## How it works

uBO-Scope does not alter network traffic, it only _observes_ it. For every network request, blocked or allowed, it will extract the base domain name. If the base domain name of the network request is different from the base domain name extracted from the URL of the web page, the network request will be deemed 3rd-party and uBO-Scope will store the pair [3rd-party base domain name, 1st-party base domain name] in its database, to be used to compute and show your overall 3rd-party exposure score of web pages you visit in the future.

Your 3rd-party exposure score depends on your past browsing history and the tools you used (if any) which have blocked network requests, and how these tools (if any) are configured. uBO-Scope does not depend on uBlock Origin to do its job, it will work with any content blocker, or no content blocker.

When you use a content blocker, or a combination of content blockers, or any other privacy-enhancing extensions which purpose is to minimize exposure to third parties (i.e. [Decentraleyes](https://github.com/Synzvato/decentraleyes)), the missing key insights are how much they benefit you overall, and whether they meet your expectations of what they do.

Content blockers typically will show you how much they block, not how much they **didn't** block. All my blocking benchmarks have always been about all the 3rd-parties which were **not** blocked. For example, uBlock Origin's [_"Blocking mode"_](https://github.com/gorhill/uBlock/wiki/Blocking-mode).

uBO-Scope is essentially a tool to measure what these benchmarks measured, except that uBO-Scope also measures ubiquitousness of third parties, and measure according to your _own_ browsing history, so the results are completely relevant to you (unlike external benchmarks which quite probably do not match your own browsing history), and the goal is to increase awareness of your own level of 3rd-party exposure.

Hopefully this will assist you in decision-making regarding which content blocker(s) you use, and/or how you configure them.

## Privacy policy

As explained above, uBO-Scope extracts the base domain of network requests and create pairs [3rd-party base domain name, 1st-party base domain name]. Distinct pairs are stored on a day-based granularity in order to be able to compute an actual 3rd-party exposure score, and a theoretical ("averted") 3rd-party exposure score.

**All the data created by uBO-Scope never leave your browser.**

The only connections uBO-Scope make to the outside world are to fetch latest version of these two resources, used internally by uBO-Scope:

- <https://publicsuffix.org/list/public_suffix_list.dat>: to correctly extract base domain names.
- <https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json>: to provide metadata (ownership, category), if any, for third parties in the popup panel.

(Actually, there is no code yet in this early version to fetch these remote resources, they are currently always loaded locally).

If you uninstall uBO-Scope, the browser will destroy its associated storage, and the data will be lost forever.

## Walkthrough

Since the primary purpose of uBO-Scope is to inform about 3rd-party exposure, it needs a browsing history to be able to do its job -- the ubiquitousness of a specific third party can only be computed according to how many distinct web sites use that specific third party.

For the purpose of this walkthrough, I created four distinct browsing profiles (using Chromium's "Person" feature), and visited the 120 [top story links of Hacker News for the past year](http://www.hntoplinks.com/year). The screenshots reflect this (short) "browsing history".

Now with some meaningful browsing history created, let's visit this [The Guardian's article](https://www.theguardian.com/environment/2017/feb/28/shell-film-warning-climate-change-rate-faster-than-end-ice-age).

***

The following screenshot was taken from the "uBlock Origin default" profile.

The 3rd-party exposure score for the page is **53**.

Notice the **3rd-party exposure heatmap**. Each cell in the heatmap correspond to a distinct 3rd party.

The darker the cell, the more ubiquitous the 3rd party. Keep in mind that ubiquitousness is computed from **your** past browsing history.

Heatmap cells are ordered from the most ubiquitous to the least ubiquitous, from left to right then top to bottom. The most ubiquitous 3rd party used by the current page is the top left cell.

Greyed heatmap cells correspond to 3rd parties which were blocked, i.e. something in your browser (likely an extension) prevented the connection to the remote server. Not connecting to 3rd parties which are useless to **you** is a good thing.

In the screenshot below, the most ubiquitous 3rd party is `google-analytics.com` (which is blocked by uBlock Origin + default settings).

![](https://cloud.githubusercontent.com/assets/585534/23466172/58e7cdc0-fe68-11e6-911a-6ec1f53463c8.png)

***

Notice that there are two 3rd-party exposure scores. The larger one is the actual 3rd-party exposure score, i.e. the score according to what **actually** occurred during page load.

The smaller one is the **averted 3rd-party exposure score**. It represents the 3rd-party exposure you would have **minimally** subjected yourself if no network request had been blocked when the page loaded.

Click on either of the 3rd-party exposure scores will cause the heatmap to switch between actual and averted view. The purpose of the averted view is to provide some sense of what would have happened if no network request had been blocked.

Notice that I used and emphasized the word **minimally** above. This is because typically, on pages which rely on a lot of 3rd parties, quite commonly many 3rd party resources loaded in your browser will cause **more** 3rd party resources to be loaded, which resources could not be seen by uBO-Scope when resources from the first wave of 3rd parties were blocked.

![](https://cloud.githubusercontent.com/assets/585534/23466176/5ca61714-fe68-11e6-9431-8df766719e79.png)

***

For convenience, you can have the heatmap render as a list, where you can see the base domain name of each 3rd-party. The score "x / y" aside each entry means: "x" = the actual ubiquitousness in percent, "y" the theoretical (averted) ubiquitousness in percent.

![](https://cloud.githubusercontent.com/assets/585534/23466180/5ec0470e-fe68-11e6-80dd-3abb29545dd3.png)

If you look closely, you will find out that the actual 3rd-party exposure score for the page is the sum of all the ubiquitouness scores of all 3rd parties for which there was a connection on the page. The theoretical (averted) 3rd-party exposure score is the sum of all the ubiquitousness scores of all 3rd parties seen (blocked or not) for the page.

There is also a filter button to filter out all the 3rd parties for which there was no network connection:

![](https://cloud.githubusercontent.com/assets/585534/23466185/6166a048-fe68-11e6-9407-cb3004573dd6.png)

Back to heatmap view from list view:

![](https://cloud.githubusercontent.com/assets/585534/23466193/63bf2cc0-fe68-11e6-86fc-385ec2eed540.png)

***
Hovering your cursor over a heatmap cell (a.k.a. 3rd party) will bring up details about that 3rd party.

So in the current case, it is found that `facebook.com` was the most ubiquitous 3rd party not being blocked when the page loaded.

![](https://cloud.githubusercontent.com/assets/585534/23466200/6601a51c-fe68-11e6-935b-6df7c245a835.png)

The other most ubiquitous 3rd party which was not blocked is `facebook.net`:

![](https://cloud.githubusercontent.com/assets/585534/23466202/685d4438-fe68-11e6-90f6-fbd12c83e420.png)

Since the page is loading resources from two of Facebook servers, the safest assumption to make is that now Facebook knows that you visited this one The Guardian article. The actual ubiquitousness of `facebook.com` is measured as 24% (in our synthetic scenario), this means Facebook knows 24% of all distinct sites which were visited.

This should bother any privacy conscious individual. If you are using uBlock Origin, you can act to what uBO-Scope is reporting to you, and in the current case, you could decide to [block connections to `facebook.com` and `facebook.net` everywhere by default](https://github.com/gorhill/uBlock/wiki/Dynamic-filtering:-to-easily-reduce-privacy-exposure).

Thankfully, the most ubiquitous 3rd party was actually blocked for that page:

![](https://cloud.githubusercontent.com/assets/585534/23466204/6aa1d90c-fe68-11e6-8e43-032f1be7d870.png)

***

Now what will uBO-Scope report if I disable uBlock Origin for that site? Here is the result, the actual 3rd-party exposure score is now **230**. Notice how the averted 3rd-party exposure score also climbed, to **353**.

![](https://cloud.githubusercontent.com/assets/585534/23466213/6f4b77ba-fe68-11e6-8ed6-85099092605f.png)

Wait... Since nothing is blocked anymore on the page, how can the averted score be different than the sctual score?

It is very important to keep in mind that **3rd-party exposure scores are computed according to whatever data has been fed to uBO-Scope so far**.

For example, `google-analytics.com` is quite ubiquitous **in theory**, as reported by uBO-Scope, but the **actual** ubiquitousness of `google-analytics.com` is still low after disabling uBlock Origin in the example above, because it was actually blocked **everywhere else** so far.

However if you would be so foolish as to whitelist `google-analytics.com`, the ubiquitousness of `google-analytics.com` as 3rd party would increase as you browse various sites and your 3rd party exposure scores would climb accordingly over time.

***

This is the results I got in the browsing profile for which no blocker at all was used:

![](https://cloud.githubusercontent.com/assets/585534/23466219/744a12b2-fe68-11e6-9746-aefe44151bc0.png)

Notice how the actual score pretty much matches the averted score when not using a blocker (the difference is down to "noise", I will cover this eventually elsewhere).

***

And this is the result I got in the browsing profile for which [uBlock Origin in medium mode](https://github.com/gorhill/uBlock/wiki/Blocking-mode:-medium-mode) was used (two local "noop" rules where created for `guardianapps.co.uk` and `guim.co.uk` and the page rendered just fine):

![](https://cloud.githubusercontent.com/assets/585534/23466225/771165d6-fe68-11e6-9023-691a66420703.png)

***

uBO-Scope will show you that not all web sites are eager to rely on so many 3rd parties -- probably safe to assume they genuinely respect the privacy of their visitors:

![](https://cloud.githubusercontent.com/assets/585534/23470329/17db0b10-fe74-11e6-96ee-35d1261483fa.png)

![](https://cloud.githubusercontent.com/assets/585534/23470331/19902ce2-fe74-11e6-8661-e2700817ecd5.png)

![](https://cloud.githubusercontent.com/assets/585534/23470338/1dcc7a22-fe74-11e6-8cbf-9bdb44f3a463.png)

***

Unfortunately these privacy-respecting web sites are not the norm:

![](https://cloud.githubusercontent.com/assets/585534/23470517/9622f4d8-fe74-11e6-8829-b046f6c81c3e.png)

But there are tools out there to deal with this. That is [uBlock Origin in medium mode](https://github.com/gorhill/uBlock/wiki/Blocking-mode:-medium-mode) below (only `nyt.com` was noop-ed):

![](https://cloud.githubusercontent.com/assets/585534/23470524/99266dc2-fe74-11e6-8aee-1563ac5a9c89.png)

***

The few settings which you can configure in uBO-Scope:

![](https://cloud.githubusercontent.com/assets/585534/23466205/6cb8269c-fe68-11e6-8aa7-9546e4cd4414.png)

Notice that you can export the data. This will create a JSON file containing the data uBO-Scope uses to calculate 3rd-party exposure scores. A whole lot more of insights can be obtained with this data, and I do plan to provide more ways for users to visualize their own data -- but with the ability to export this data you can manipulate your own data as you wish.

Ability to import is not implemented yet.
