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
import { hostnameFromURI } from './utils.js';
import { default as psl } from './lib/publicsuffixlist.js';
import { default as punycode } from './lib/punycode.es6.js';

/******************************************************************************/

const manifest = runtime.getManifest();

const TABDETAILS_TEMPLATE = {
    domain: '',
    hostname: '',
    allowed: new Map(),
    stealth: new Map(),
    blocked: new Map(),
};

const reIsNetwork = /^(?:https?|wss?):/;

/******************************************************************************/

const session = {
    tabidToHostname: new Map(),
    tabidToDetails: new Map(),
    mruTabDetails: [],
    
};

async function loadSessionData() {
    const s = await sessionRead('sessionData');
    if ( typeof s !== 'string' ) { return; }
    Object.assign(session, deserialize(s));
}

async function saveSessionData() {
    const s = serialize(session, { compress: true });
    await sessionWrite('sessionData', s);
}

async function saveSessionDataDebounced() {
    if ( saveSessionDataDebounced.timer !== undefined ) { return; }
    saveSessionDataDebounced.timer = setTimeout(( ) => {
        saveSessionDataDebounced.timer = undefined;
        saveSessionData();
    }, 10000);
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
    sessionWrite('publicSuffixList', serialize(selfie, { compress: true }));
}

/******************************************************************************/

function domainFromHostname(hostname) {
    return psl.getDomain(hostname) || hostname;
}

/******************************************************************************/

function updateTabBadge(tabId) {
    if ( tabId === -1 ) { return; }
    const hostname = session.tabidToHostname.get(tabId);
    const tabDetails = session.tabidToDetails.get(`${tabId}/${hostname}`);
    if ( tabDetails === undefined ) { return; }
    const count = tabDetails.allowed.size;
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
    tabDetails.allowed.clear();
    tabDetails.stealth.clear();
    tabDetails.blocked.clear();
}

function outcomeDetailsAdd(outcomeDetails, hostname, url, type) {
    const domain = domainFromHostname(hostname);
    const r = outcomeDetails.has(domain);
    const requests = outcomeDetails.get(domain) || (new Set());
    if ( requests.size === 0 ) {
        outcomeDetails.set(domain, requests);
    }
    const request = `${url} ${type}`;
    if ( requests.has(request) ) { return false; }
    if ( requests.size >= 101 ) { return false; }
    requests.add(request);
    return r;
}

/******************************************************************************/

function recordOutcome(tabId, request) {
    const { type, url, frameId } = request;
    const tabHostname = session.tabidToHostname.get(tabId);
    const tabDetailsKey = `${tabId}/${tabHostname}`;
    const tabDetails = session.tabidToDetails.get(tabDetailsKey) ||
        structuredClone(TABDETAILS_TEMPLATE);
    if ( tabDetails.hostname === '' ) {
        tabDetails.hostname = tabHostname;
        tabDetails.domain = domainFromHostname(tabDetails.hostname);
    }
    const pos = session.mruTabDetails.lastIndexOf(tabDetailsKey);
    if ( pos !== -1 ) {
        session.mruTabDetails.splice(pos, 1);
    }
    session.mruTabDetails.unshift(tabDetailsKey);
    while ( session.mruTabDetails.length > 100 ) {
        const key = session.mruTabDetails.pop();
        session.tabidToDetails.delete(key);
    }
    if ( tabDetails.tabId === undefined ) {
        tabDetails.tabId = tabId;
        session.tabidToDetails.set(tabDetailsKey, tabDetails);
    }
    const hostname = hostnameFromURI(url);
    if ( frameId === 0 ) {
        if ( type === 'main_frame' ) {
            tabDetailsReset(tabDetails);
            tabDetails.hostname = hostname;
            tabDetails.domain = domainFromHostname(hostname);
            session.tabidToHostname.set(tabId, hostname);
            outcomeDetailsAdd(tabDetails.allowed, hostname, url, type);
            return true;
        }
        if ( tabDetails.hostname === '' ) {
            const top = request.initiator || request.documentUrl;
            if ( top ) {
                tabDetails.hostname = hostnameFromURI(top);
                tabDetails.domain = domainFromHostname(tabDetails.hostname);
            }
        }
    }
    switch ( request.event ) {
    case 'redirect':
        outcomeDetailsAdd(tabDetails.stealth, hostname, url, type);
        break;
    case 'error':
        outcomeDetailsAdd(tabDetails.blocked, hostname, url, type);
        break;
    case 'success':
        if ( outcomeDetailsAdd(tabDetails.allowed, hostname, url, type) ) { return true; }
        return true;
    default:
        break;
    }
    return false;
}

/******************************************************************************/

const networkRequestJournal = [];

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
    saveSessionDataDebounced();
}

function queueNetworkRequest(details, event) {
    details.event = event;
    networkRequestJournal.push(details);
    if ( queueNetworkRequest.timer !== undefined ) { return; }
    queueNetworkRequest.timer = setTimeout(( ) => {
        queueNetworkRequest.timer = undefined;
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
        const { tabId, hostname } = msg;
        const target = `${tabId}/${hostname}`;
        response = appIsReady.then(( ) => {
            const tabDetails = session.tabidToDetails.get(target);
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
    const target = `${tabId}/`;
    for ( const key of session.tabidToDetails.keys() ) {
        if ( key.startsWith(target) === false ) { continue; }
        session.tabidToDetails.delete(key);
    }
    let i = session.mruTabDetails.length;
    while ( i-- ) {
        if ( session.mruTabDetails[i].startsWith(target) === false ) { continue; }
        session.mruTabDetails.splice(i, 1);
    }
    session.tabidToHostname.delete(tabId);
    saveSessionDataDebounced();
});

browser.webNavigation.onBeforeNavigate.addListener(async details => {
    if ( details.tabId === -1 ) { return; }
    if ( details.parentFrameId !== -1 ) { return; }
    if ( details.frameId !== 0 ) { return; }
    await appIsReady;
    session.tabidToHostname.set(details.tabId, hostnameFromURI(details.url));
});

browser.webNavigation.onCommitted.addListener(async details => {
    if ( details.tabId === -1 ) { return; }
    if ( details.parentFrameId !== -1 ) { return; }
    if ( details.frameId !== 0 ) { return; }
    await appIsReady;
    updateTabBadge(details.tabId);
});

/******************************************************************************/

const appIsReady = (( ) => {
    return Promise.all([
        loadPublicSuffixList(),
        loadSessionData(),
    ]);
})();

/******************************************************************************/
