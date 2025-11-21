/*******************************************************************************

    uBO-Scope - Companion extension to uBlock Origin: it measures stuff.
    Copyright (C) 2025 Raymond Hill

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

function reportTiming() {
    if ( document.readyState !== 'complete' ) { return; }
    const entries = performance.getEntriesByType('navigation');
    if ( entries.length === 0 ) { return; }
    const entry = entries[0];
    const timing = Math.round(entry.domComplete - entry.responseStart);
    if ( timing > 0 ) {
        chrome.runtime.sendMessage({
            what: 'setPageTiming',
            hostname: document.location.hostname,
            timing: Math.round(timing),
        });
    }
    document.removeEventListener('readystatechange', reportTiming);
}

if ( document.readyState === 'complete' ) {
    reportTiming();
} else {
    document.addEventListener('readystatechange', reportTiming);
}
