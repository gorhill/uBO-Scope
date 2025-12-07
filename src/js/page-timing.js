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

(( ) => {
    const entries = performance.getEntries();
    const nav = entries.find(a => a.entryType === 'navigation') || {};
    const fcp = entries.find(a => a.name === 'first-contentful-paint') || {};
    return {
        frb: Math.round(nav.responseStart || 0),
        dcl: Math.round(nav.domInteractive || 0),
        l: Math.round(nav.domComplete || 0),
        fcp: Math.round(fcp.startTime || 0),
    };
})();
