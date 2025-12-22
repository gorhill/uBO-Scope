/*******************************************************************************

    uBO-Scope - Companion extension to uBlock Origin: it measures stuff.
    Copyright (C) 2017 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBO-Scope
*/

//import { default as punycode } from './lib/punycode.es6.js';
import {
    browser,
    runtime,
    sendMessage,
    sessionRead,
    sessionWrite,
} from './ext.js';
import { deserialize, serialize } from './lib/s14e-serializer.js';
import { dom, qs$ } from './dom.js';
import { hostnameFromURI } from './utils.js';
import { default as punycode } from './lib/punycode.es6.js';

/******************************************************************************/

const prettyTypes = {
    fetch: 'xhr',
    image: 'img',
    imageset: 'img',
    main_frame: 'doc',
    script: 'js',
    stylesheet: 'css',
    sub_frame: 'frm',
    xmlhttprequest: 'xhr',
};

const currentTab = {};
let tabData = {};

const expandableRealms = new Set();
const expandedRealms = new Set();

const twoDigitNumberFormatter = new Intl.NumberFormat(undefined, {
    maximumSignificantDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(undefined, {
    maximumSignificantDigits: 3,
});

const timingStatsHistory = sessionRead('timingStats');

/******************************************************************************/

function textFromCount(count) {
    return count < 101 ? `${count}` : '>100';
}

/******************************************************************************/

function parseRequest(request) {
    const pos = request.lastIndexOf(' ');
    const type = request.slice(pos+1);
    return {
        type: prettyTypes[type] || type,
        url: request.slice(0, pos),
    };
}

/******************************************************************************/

function sortRequests(requests) {
    return Array.from(requests).toSorted((a, b) => {
        if ( a.type !== b.type ) {
            if ( a.type === 'doc' ) { return -1; }
            if ( b.type === 'doc' ) { return 1; }
            return a.type.localeCompare(b.type);
        }
        const hna = hostnameFromURI(a.url);
        const hnb = hostnameFromURI(b.url);
        const diff = hna.length - hnb.length;
        if ( diff !== 0 ) { return diff; }
        return hna.localeCompare(hnb);
    });
}

/******************************************************************************/

function nodeFromTemplate(templateId, nodeSelector) {
    const template = qs$(`template#${templateId}`);
    const fragment = template.content.cloneNode(true);
    const node = nodeSelector !== undefined
        ? qs$(fragment, nodeSelector)
        : fragment.firstElementChild;
    return node;
}

/******************************************************************************/

function renderPanel() {
    const { hostname: tabHostname } = tabData;
    if ( Boolean(tabHostname) === false ) { return; }
    const { domain: tabDomain } = tabData;
    dom.text('#tabHostname > span:last-of-type', punycode.toUnicode(tabDomain));
    renderTiming();
    //renderMemory();
    if ( tabHostname !== tabDomain ) {
        dom.text('#tabHostname > span:first-of-type',
            punycode.toUnicode(tabHostname.slice(0, -tabDomain.length))
        );
    }
    renderPanelSection(tabDomain, tabData.allowed, 'allowed');
    renderPanelSection(tabDomain, tabData.stealth, 'stealth');
    renderPanelSection(tabDomain, tabData.blocked, 'blocked');
    dom.text('#domainCount > span', Number(tabData.allowed.size).toLocaleString());
}

function renderPanelSection(topDomain, domainMap, outcome) {
    const sorted = Array.from(domainMap).toSorted((a, b) => {
        const da = a[0];
        const db = b[0];
        if ( da !== db ) {
            if ( da === topDomain ) { return -1; }
            if ( db === topDomain ) { return 1; }
        }
        return da.localeCompare(db);
    });
    const section = qs$(`[data-outcome="${outcome}"] .domains`);
    for ( const [ domain, urls ] of sorted ) {
        const row = nodeFromTemplate('domainRow', '[data-domain]');
        row.dataset.domain = domain;
        dom.text(qs$(row, '.domain'), punycode.toUnicode(domain));
        dom.text(qs$(row, '.count'), textFromCount(urls.size));
        section.append(row);
    }
}

/******************************************************************************/

async function renderTiming() {
    const data = await sendMessage({
        what: 'getPageTiming',
        tabId: tabData.tabId,
    }) || {};
    const widget = createTimingWidget(data);
    dom.clear('#pageStats > .pageTiming');
    qs$('#pageStats > .pageTiming').append(widget);
    if ( Object.keys(data).some(a => data[a] === 0) ) {
        return self.setTimeout(renderTiming, 1000);
    }
    const result = { hn: tabData.hostname, data };
    timingStatsHistory.then((stats = []) => {
        if ( stats.length !== 0 ) {
            if ( hashFromData(stats[0]) === hashFromData(result) ) { return stats; }
        }
        stats.unshift(result);
        if ( stats.length > 20 ) {
            stats = stats.slice(0, 20);
        }
        sessionWrite('timingStats', stats);
        return stats;
    }).then((history = []) => {
        for ( const entry of history ) {
            if ( entry.hn !== tabData.hostname ) { continue; }
            if ( hashFromData(entry) === hashFromData(result) ) { continue; }
            const widget = createTimingWidget(entry.data);
            qs$('#pageStats aside div[data-name="history"]').append(widget);
        }
    });
}

function hashFromData(entry) {
    return [ entry.hn, entry.data.frb, entry.data.l, entry.data.fcp ].join();
}

/******************************************************************************/

function createTimingWidget(data) {
    const t1 = 2400;
    const root = nodeFromTemplate('pageTimeline', '.pageTimeline');
    renderBar(qs$(root, '.bar'), data.frb, data.l, t1);
    qs$(root, '.fcp').style.left = `calc(${positionFromTime(data.fcp, t1)}% - 1px)`;
    return root;
}

function renderBar(node, ta, tb, t1) {
    const left = positionFromTime(ta, t1);
    const right = Math.min(positionFromTime(tb, t1), 100);
    node.style.left = `${left}%`;
    node.style.width = `max(${right - left}%, 1px)`;
    const fromColor = colorFromTime(ta, t1);
    const toColor = colorFromTime(tb, t1);
    node.style.background = `linear-gradient(to right in hsl shorter hue, ${fromColor}, ${toColor})`;
    if ( tb > t1 ) {
        dom.text(qs$(node, '.bar > span'), `${twoDigitNumberFormatter.format(tb / 1000)}\u2192`);
    }
}

function positionFromTime(t, t1) {
    return t / t1 * 100;
}

function colorFromTime(t, t1) {
    const tnormalized = Math.min(Math.max(t, 0), t1) / t1;
    const h = 120 * (1 - tnormalized);
    const l = 38 + 12 * tnormalized;
    return `hsl(${h} 100% ${l}%)`;
}

/******************************************************************************/

async function renderMemory() {
    let bytes = await sendMessage({
        what: 'getPageMemory',
        tabId: tabData.tabId,
    }) || 0;
    let unit = '';
    if ( bytes < 1000000 ) {
        unit = 'KB';
        bytes /= 1000;
    } else if ( bytes < 1000000000 ) {
        unit = 'MB';
        bytes /= 1000000;
    } else {
        unit = 'GB';
        bytes /= 1000000000;
    }
    dom.text('#pageMemory > span', `${numberFormatter.format(bytes)} ${unit}`);
    self.setTimeout(renderMemory, 2500);
}

/******************************************************************************/

function toggleExpand(expandKey, afterState, persist) {
    const pos = expandKey.indexOf('/');
    const outcome = expandKey.slice(0, pos);
    const domain = expandKey.slice(pos+1);
    const domainRow = qs$(`[data-outcome="${outcome}"] [data-domain="${domain}"]`);
    if ( domainRow === null ) { return; }
    const beforeState = domainRow.dataset.expanded = '1';
    if ( afterState === beforeState ) { return; }
    if ( expandableRealms.has(expandKey) === false ) {
        const requests = tabData?.[outcome]?.get(domain);
        if ( Boolean(requests) === false ) { return; }
        const parsedRequests = Array.from(requests).map(a => parseRequest(a));
        const sortedRequests = sortRequests(parsedRequests);
        const div = nodeFromTemplate('urls', 'ul');
        for ( const request of sortedRequests ) {
            const row = renderURLRow(domain, request);
            div.append(row);
        }
        domainRow.after(div);
        expandableRealms.add(expandKey);
    }
    if ( afterState ) {
        domainRow.dataset.expanded = '1';
        expandedRealms.add(expandKey);
    } else {
        domainRow.dataset.expanded = '0';
        expandedRealms.delete(expandKey);
    }
    if ( persist !== true ) { return; }
    sessionWrite('popup.expandedRealms', serialize(expandedRealms));
}

function onToggleExpand(ev) {
    const { target } = ev;
    const row = target.closest('[data-domain]');
    if ( row === null ) { return; }
    const outcome = row.closest('[data-outcome]');
    if ( outcome === null ) { return; }
    const expandKey = `${outcome.dataset.outcome}/${row.dataset.domain}`;
    toggleExpand(expandKey, row.dataset.expanded === '0', true);
}

/******************************************************************************/

function renderURLRow(domain, { type, url }) {
    const row = nodeFromTemplate('urlRow', 'li');
    dom.text(qs$(row, '.type'), (prettyTypes[type] || type).slice(0, 4));
    const parsedURL = new URL(url);
    dom.attr(qs$(row, '.url'), 'href', url);
    dom.text(qs$(row, '.subdomain'), parsedURL.hostname.slice(0, -domain.length));
    dom.text(qs$(row, '.domain'), '*');
    dom.text(qs$(row, '.path'), `${parsedURL.pathname}${parsedURL.search}`);
    return row;
}

/******************************************************************************/

const extensionOrigin = runtime.getURL('');

if ( extensionOrigin.startsWith('safari-web-extension:') ) {
    dom.cl.add(dom.html, 'safari');
} else if ( extensionOrigin.startsWith('moz-extension:') ) {
    dom.cl.add(dom.html, 'firefox');
}

(async ( ) => {
    const [ tab ] = await browser.tabs.query({ active: true, currentWindow: true });
    if ( tab instanceof Object === false ) { return true; }
    Object.assign(currentTab, tab);

    {
        const s = await sendMessage({
            what: 'getTabData',
            tabId: currentTab.id,
            hostname: hostnameFromURI(tab.url),
        });
        const response = deserialize(s);
        if ( response ) { tabData = response; }
    }

    renderPanel();

    {
        const s = await sessionRead('popup.expandedRealms');
        if ( typeof s === 'string' ) {
            const expanded = deserialize(s);
            if ( expanded instanceof Set ) {
                for ( const key of expanded ) {
                    expandedRealms.add(key);
                    toggleExpand(key, true, false);
                }
            }
        }
    }

    dom.cl.toggle(dom.body, 'fitViewport',
        Math.abs(dom.body.clientWidth - dom.html.clientWidth) > 16
    );
    dom.cl.remove(dom.body, 'loading');
    dom.on('#pageStats menu > li', 'click', ev => {
        const li = ev.target.closest('li');
        if ( li === null ) { return; }
        const owner = li.closest('aside');
        owner.dataset.name = li.dataset.name !== owner.dataset.name
            ? li.dataset.name
            : '';
    });
    dom.on('main', 'click', 'section .expander', onToggleExpand);
})();
