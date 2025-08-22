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

import {
    browser,
    runtime,
    sessionRead,
    sessionWrite,
} from './ext.js';
import {
    deserialize,
    serialize,
} from './lib/s14e-serializer.js';
import { default as psl } from './lib/publicsuffixlist.js';
import { default as punycode } from './lib/punycode.es6.js';

/******************************************************************************/

const manifest = runtime.getManifest();

const TABDETAILS_ENTITY = {
    domain: '',
    hostname: '',
    allowed: {
        domains: new Map(),
        hostnames: new Map(),
    },
    stealth: {
        domains: new Map(),
        hostnames: new Map(),
    },
    blocked: {
        domains: new Map(),
        hostnames: new Map(),
    },
};

const reIsNetwork = /^(?:https?|wss?):/;

/******************************************************************************/

const session = {
    tabIdToDetailsMap: new Map(),
};

async function loadSessionData() {
    const s = await sessionRead('sessionData');
    if ( typeof s !== 'string' ) { return; }
    Object.assign(session, deserialize(s));
}

async function saveSessionData() {
    const s = serialize(session);
    await sessionWrite('sessionData', s);
}

/******************************************************************************/

async function loadPublicSuffixList() {
    const s = await sessionRead('publicSuffixList');
    if ( typeof s === 'string' ) {
        const selfie = deserialize(s);
        if ( psl.fromSelfie(selfie) ) { return; }
    }
    const response = await fetch(
        '/assets/thirdparties/publicsuffix.org/list/public_suffix_list.dat'
    );
    const content = await response.text();
    psl.parse(content, punycode.toASCII);
    const selfie = psl.toSelfie();
    sessionWrite('publicSuffixList', serialize(selfie));
}

/******************************************************************************/

const urlParser = new URL('about:blank');

function hostnameFromURI(url) {
    urlParser.href = url;
    return urlParser.hostname || '';
}

function domainFromHostname(hostname) {
    return psl.getDomain(hostname) ||
           psl.getPublicSuffix(hostname);
}

/******************************************************************************/

function updateTabBadge(tabId) {
    if ( tabId === -1 ) { return; }
    const tabDetails = session.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return; }
    const count = tabDetails.allowed.domains.size;
    browser.action.setBadgeText({
        tabId,
        text: count !== 0 ? `${count}` : ''
    }).catch(( ) => {
    });
}

/******************************************************************************/

function tabDetailsReset(tabDetails) {
    tabDetails.domain = '';
    tabDetails.hostname = '';
    tabDetails.allowed.domains.clear();
    tabDetails.allowed.hostnames.clear();
    tabDetails.stealth.domains.clear();
    tabDetails.stealth.hostnames.clear();
    tabDetails.blocked.domains.clear();
    tabDetails.blocked.hostnames.clear();
}

function outcomeDetailsAdd(outcomeDetails, hostname) {
    let count = outcomeDetails.hostnames.get(hostname) || 0;
    outcomeDetails.hostnames.set(hostname, count+1);
    const domain = domainFromHostname(hostname);
    const r = outcomeDetails.domains.has(domain);
    count = outcomeDetails.domains.get(domain) || 0;
    outcomeDetails.domains.set(domain, count+1);
    return r;
}

/******************************************************************************/

function recordOutcome(tabId, request) {
    const { type, url } = request;
    const tabDetails = session.tabIdToDetailsMap.get(tabId) ||
        structuredClone(TABDETAILS_ENTITY);
    if ( tabDetails.tabId === undefined ) {
        tabDetails.tabId = tabId;
        session.tabIdToDetailsMap.set(tabId, tabDetails);
    }
    const hostname = hostnameFromURI(url);
    if ( type === 'main_frame' ) {
        tabDetailsReset(tabDetails);
        tabDetails.hostname = hostname;
        tabDetails.domain = domainFromHostname(hostname);
        outcomeDetailsAdd(tabDetails.allowed, hostname);
        return true;
    }
    if ( tabDetails.hostname === '' && request.frameId === 0 ) {
        const top = request.initiator || request.documentUrl;
        if ( top ) {
            tabDetails.hostname = hostnameFromURI(top);
            tabDetails.domain = domainFromHostname(tabDetails.hostname);
        }
    }
    switch ( request.event ) {
    case 'redirect':
        outcomeDetailsAdd(tabDetails.stealth, hostname);
        break;
    case 'error':
        outcomeDetailsAdd(tabDetails.blocked, hostname);
        break;
    case 'success':
        if ( outcomeDetailsAdd(tabDetails.allowed, hostname) ) { return true; }
        return true;
    default:
        break;
    }
    return false;
}

/******************************************************************************/

const networkRequestJournal = [];
let networkRequestJournalTimer;

async function processNetworkRequestJournal() {
    await appIsReady;
    const tabIds = new Set();
    for ( const request of networkRequestJournal ) {
        const { tabId } = request;
        if ( request.tabId === -1 ) { continue; }
        if ( request.event === 'redirect' ) {
            if ( reIsNetwork.test(request.redirectUrl) === false ) {
                recordOutcome(tabId, request);
            }
            continue;
        }
        if ( request.event === 'error' ) {
            recordOutcome(tabId, request);
            continue;
        }
        if ( request.event === 'success' ) {
            if ( request.ip || request.statusCode !== 0 ) {
                if ( recordOutcome(tabId, request) ) {
                    tabIds.add(request.tabId);
                }
            } else {
                request.event = 'error';
                recordOutcome(tabId, request);
            }
            continue;
        }
    }
    networkRequestJournal.length = 0;
    for ( const tabId of tabIds ) {
        updateTabBadge(tabId);
    }
    saveSessionData();
}

function queueNetworkRequest(details, event) {
    details.event = event;
    networkRequestJournal.push(details);
    if ( networkRequestJournalTimer !== undefined ) { return; }
    networkRequestJournalTimer = setTimeout(( ) => {
        networkRequestJournalTimer = undefined;
        processNetworkRequestJournal();
    }, 1000);
}

browser.webRequest.onBeforeRedirect.addListener(details => {
    queueNetworkRequest(details, 'redirect');
}, { urls: manifest.host_permissions });

browser.webRequest.onErrorOccurred.addListener(details => {
    queueNetworkRequest(details, 'error');
}, { urls: manifest.host_permissions });

browser.webRequest.onResponseStarted.addListener(details => {
    queueNetworkRequest(details, 'success');
}, { urls: manifest.host_permissions });

/******************************************************************************/

runtime.onMessage.addListener((msg, sender, callback) => {
    let response;
    switch ( msg?.what ) {
    case 'getTabData': {
        const { tabId } = msg;
        response = appIsReady.then(( ) => {
            const tabDetails = session.tabIdToDetailsMap.get(tabId);
            callback(serialize(tabDetails));
        });
        break;
    }
    default:
        break;
    }
    if ( response instanceof Promise ) {
        response.then(r => { callback(r); });
        return true;
    }
    callback(response);
    return false;
});

/******************************************************************************/

browser.tabs.onRemoved.addListener(async tabId => {
    await appIsReady;
    const tabDetails = session.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return; }
    session.tabIdToDetailsMap.delete(tabId);
    saveSessionData();
});

/******************************************************************************/

const appIsReady = (( ) => {
    return Promise.all([
        loadPublicSuffixList(),
        loadSessionData(),
    ]);
})();

/******************************************************************************/
