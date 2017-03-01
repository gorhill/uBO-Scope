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

'use strict';

/******************************************************************************/

(function() {

/******************************************************************************/

if ( self.browser instanceof Object === false ) {
    if ( self.chrome instanceof Object === false ) {
        throw new Error('!?!');
    }
    self.browser = self.chrome;
}

let browser = self.browser;

/******************************************************************************/

document.querySelector('#daysBefore').addEventListener(
    'change',
    function() {
        let input = document.getElementById('daysBefore'),
            value = parseInt(input.value, 10);
        if ( isNaN(value) ) {
            value = 30;
        }
        value = Math.min(365, Math.max(1, value));
        browser.runtime.sendMessage({
            what: 'setDaysBefore',
            value: value
        });
    }
);

browser.runtime.sendMessage(
    { what: 'getDaysBefore' },
    function(response) {
        document.querySelector('#daysBefore').value = response;
    }
);

/******************************************************************************/

// Convert RGB to valid hue value.
// http://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/

let validHueFromRgb = function(rgb) {
    let r = parseInt(rgb.slice(1, 3), 16) / 255,
        g = parseInt(rgb.slice(3, 5), 16) / 255,
        b = parseInt(rgb.slice(5, 7), 16) / 255,
        max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min;
    let v;
    if ( r === max ) {
        v = (g - b) / d;
    } else if ( g === max ) {
        v = 2 + (b - r) / d;
    } else {
        v = 4 + (r - g) / d;
    }
    v = v * 60;
    if ( v < 0 ) {
        v += 360;
    }
    if ( isNaN(v) ) {
        v = 0;
    }
    return Math.round(v);
};

let rgbStringFromValidHue = function(hue) {
    let zeropad = function(s) {
        return s.length === 1 ? '0' + s : s;
    };
    let normal = hue / 360,
        tmpR = normal + 0.333,
        tmpG = normal,
        tmpB = normal - 0.333;
    if ( tmpR < 0 ) { tmpR += 1; }
    else if ( tmpR > 1 ) { tmpR -= 1; }
    if ( tmpB < 0 ) { tmpB += 1; }
    else if ( tmpB > 1 ) { tmpB -= 1; }
    let r, g, b;
    if ( (6 * tmpR) < 1 ) {
        r = 6 * tmpR;
    } else if ( (2 * tmpR) < 1 ) {
        r = 1;
    } else if ( (3 * tmpR) < 2 ) {
        r = 6 * (0.666 - tmpR);
    } else {
        r = 0;
    }
    r = Math.round(r * 255).toString(16);
    if ( (6 * tmpG) < 1 ) {
        g = 6 * tmpG;
    } else if ( (2 * tmpG) < 1 ) {
        g = 1;
    } else if ( (3 * tmpG) < 2 ) {
        g = 6 * (0.666 - tmpG);
    } else {
        g = 0;
    }
    g = Math.round(g * 255).toString(16);
    if ( (6 * tmpB) < 1 ) {
        b = 6 * tmpB;
    } else if ( (2 * tmpB) < 1 ) {
        b = 1;
    } else if ( (3 * tmpB) < 2 ) {
        b = 6 * (0.666 - tmpB);
    } else {
        b = 0;
    }
    b = Math.round(b * 255).toString(16);
    return '#' + zeropad(r) + zeropad(g) + zeropad(b);
};

/******************************************************************************/

document.querySelector('#heatmapHue').addEventListener(
    'change',
    function() {
        let input = document.getElementById('heatmapHue'),
            hue = validHueFromRgb(input.value),
            rgb = rgbStringFromValidHue(hue);
        if ( rgb !== input.value ) {
            input.value = rgb;
        }
        browser.runtime.sendMessage({
            what: 'setHeatmapHue',
            value: hue
        });
    }
);

browser.runtime.sendMessage(
    { what: 'getHeatmapHue' },
    function(response) {
        document.querySelector('#heatmapHue').value = rgbStringFromValidHue(response);
    }
);

/******************************************************************************/

document.querySelector('#export').addEventListener(
    'click',
    function() {
        browser.runtime.sendMessage({ what: 'doExportData' });
    }
);

/******************************************************************************/

browser.runtime.sendMessage(
    { what: 'getStorageUsed' },
    function(response) {
        document.querySelector('#storageUsed').textContent = typeof
            response === 'number' ?
                response.toLocaleString() :
                '?';
    }
);

/******************************************************************************/

})();
