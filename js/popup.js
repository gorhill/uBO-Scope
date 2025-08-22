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
import { browser, sendMessage, } from './ext.js';
import { dom, qs$ } from './dom.js';
import { deserialize } from './lib/s14e-serializer.js';
import { default as punycode } from './lib/punycode.es6.js';

/******************************************************************************/

function renderPanel(data = {}) {
    const { hostname: tabHostname } = data;
    if ( Boolean(tabHostname) === false ) { return; }
    const { domain: tabDomain } = data;
    dom.text('#tabHostname > span:last-of-type',
        punycode.toUnicode(tabDomain)
    );
    if ( tabHostname !== tabDomain ) {
        dom.text('#tabHostname > span:first-of-type',
            punycode.toUnicode(tabHostname.slice(0, -tabDomain.length))
        );
    }
    const { allowed, blocked, stealth } = data;
    const rowTemplate = qs$('template#domainRow');
    const allDomains = new Set();
    const allowedSorted = Array.from(allowed.domains).toSorted();
    const allowedSection = qs$('.outcome.allowed .domains');
    for ( const [ domain, count ] of allowedSorted ) {
        const row = rowTemplate.content.cloneNode(true);
        dom.text(qs$(row, '.domain'), punycode.toUnicode(domain));
        dom.text(qs$(row, '.count'), count);
        allowedSection.append(row);
        allDomains.add(domain);
    }
    const stealthSorted = Array.from(stealth.domains).toSorted();
    const stealthSection = qs$('.outcome.stealth .domains');
    for ( const [ domain, count ] of stealthSorted ) {
        const row = rowTemplate.content.cloneNode(true);
        dom.text(qs$(row, '.domain'), punycode.toUnicode(domain));
        dom.text(qs$(row, '.count'), count);
        stealthSection.append(row);
    }
    const blockededSorted = Array.from(blocked.domains).toSorted();
    const blockedSection = qs$('.outcome.blocked .domains');
    for ( const [ domain, count ] of blockededSorted ) {
        const row = rowTemplate.content.cloneNode(true);
        dom.text(qs$(row, '.domain'), punycode.toUnicode(domain));
        dom.text(qs$(row, '.count'), count);
        blockedSection.append(row);
    }
    dom.text('#summary > span', Number(allDomains.size).toLocaleString());
}

/******************************************************************************/

const currentTab = {};

(async ( ) => {
    const [ tab ] = await browser.tabs.query({ active: true, currentWindow: true });
    if ( tab instanceof Object === false ) { return true; }
    Object.assign(currentTab, tab);

    sendMessage({
        what: 'getTabData',
        tabId: currentTab.id,
    }).then(s => {
        const response = deserialize(s);
        renderPanel(response);
    }).finally(( ) => {
        dom.cl.remove(dom.body, 'loading');
    });
})();
