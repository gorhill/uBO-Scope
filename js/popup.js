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

/* global punycode */

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

var browser = self.browser;

/******************************************************************************/

var heatmaps = document.querySelector('#heatmaps'),
    domain3rdDetails = document.querySelector('#domain3rdDetails'),
    domainToAuthorityInfoMap = new Map();

domain3rdDetails.classList.add('hide');

/******************************************************************************/

var lpadNumber = function(v, pad) {
    var s = Math.ceil(v).toString(10),
        d = pad - s.length;
    if ( d <= 0 ) { return s; }
    return '\u2007\u2007\u2007\u2007'.slice(-d) + s;
};

/******************************************************************************/

// "downward" => toward the root element.

var lookupDownward = function(node, selector) {
    while ( node && typeof node.matches === 'function' ) {
        if ( node.matches(selector) ) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
};

/******************************************************************************/

var setTextContent = function(selector, text) {
    let nodes = document.querySelectorAll(selector),
        i = nodes.length;
    while( i-- ) {
        nodes[i].textContent = text;
    }
};

/******************************************************************************/
var renderPanel = function(data) {
    if ( !data ) {
        document.body.classList.add('nodata');
        return;
    }
    // 1st domain. If the domain name contains Unicode characters, we will also
    // display the plain ASCII version of the domain name.
    let domain1stUnicode = punycode.toUnicode(data.domain1st);
    document.querySelector('#domain1st > div:first-of-type').textContent = domain1stUnicode;
    if ( domain1stUnicode !== data.domain1st ) {
        document.querySelector('#domain1st > div:last-of-type').textContent = data.domain1st;
    }
    // Remember whether the heatmap must be rendered as a list.
    toggleMap(localStorage.getItem('viewAsList') === '1');
    toggleFilter(localStorage.getItem('hideBlocked') === '1');
    // Compute and render the heatmap data into HTML.
    let actualScoreTotal = 0,
        theoriticalScoreTotal = 0,
        tabConnected3rd = new Set(data.connected.tab3parties),
        allConnected3rdToCountMap = new Map(data.connected.all3pCounts),
        all3rdToCountMap = new Map(data.all.all3pCounts),
        colorTemplate = 'hsl({h}, 100%, {-l}%)'.replace('{h}', data.heatmapHue),
        reverseValue = colorTemplate.indexOf('{-l}') !== -1,
        collator = new Intl.Collator();
    // Remember authority info if available, for use in info card.
    if ( Array.isArray(data.domainToAuthorityInfo) ) {
        domainToAuthorityInfoMap = new Map(data.domainToAuthorityInfo);
    }
    // Order 3rd parties from most ubiquitous to least ubiquitous
    data.all.tab3parties.sort(function(a, b) {
        var av = all3rdToCountMap.get(a),
            bv = all3rdToCountMap.get(b);
        if ( av !== bv ) {
            return bv - av;
        }
        return collator.compare(a, b);
    });
    let hmrowTemplate = document.querySelector('#templates .hmrow'),
        cellsPerRow = hmrowTemplate.children.length,
        ahm = document.querySelector('.heatmap.actual'), arow, acell,
        thm = document.querySelector('.heatmap.theoretical'), trow, tcell,
        domain3rd, actualScore, theoreticalScore, title, value;
    for ( var ri = 0, rn = Math.ceil(data.all.tab3parties.length / cellsPerRow); ri < rn; ri++ ) {
        arow = hmrowTemplate.cloneNode(true);
        trow = hmrowTemplate.cloneNode(true);
        for ( var ci = 0; ci < cellsPerRow; ci++ ) {
            domain3rd = data.all.tab3parties[ri * cellsPerRow + ci];
            acell = arow.children[ci];
            tcell = trow.children[ci];
            if ( domain3rd ) {
                acell.setAttribute('data-domain', domain3rd);
                tcell.setAttribute('data-domain', domain3rd);
                actualScore = Math.max(
                    (allConnected3rdToCountMap.get(domain3rd) || 0) / data.all1pCount * 100,
                    1
                );
                acell.setAttribute('data-actual-score', actualScore);
                tcell.setAttribute('data-actual-score', actualScore);
                if ( tabConnected3rd.has(domain3rd) ) {
                    actualScoreTotal += actualScore;
                    value = Math.max(actualScore, 5);
                    if ( reverseValue ) { value = 100 - value; }
                    acell.children[0].style.backgroundColor = colorTemplate.replace(/\{-?l\}/, value.toFixed(0));
                } else {
                    acell.classList.add('blocked');
                }
                theoreticalScore = Math.max(
                    all3rdToCountMap.get(domain3rd) / data.all1pCount * 100,
                    1
                );
                acell.setAttribute('data-theoretical-score', theoreticalScore);
                tcell.setAttribute('data-theoretical-score', theoreticalScore);
                // TODO: still need to investigate why this can happen
                if ( isNaN(theoreticalScore) === false ) {
                    theoriticalScoreTotal += theoreticalScore;
                }
                value = Math.max(theoreticalScore, 5);
                if ( reverseValue ) { value = 100 - value; }
                tcell.children[0].style.backgroundColor = colorTemplate.replace(/\{-?l\}/, value.toFixed(0));
                
                //My added part
                
                let authorityInfo = domainToAuthorityInfoMap.get(domain3rd);
                let infoString = "";
                if ( authorityInfo !== undefined ) {
                    infoString = (authorityInfo.category || '') + " " + (authorityInfo.authority || '') + ": ";
                }
                
                title = /*infoString + */ domain3rd + ' ' + lpadNumber(actualScore, 2) + ' / ' + lpadNumber(theoreticalScore, 2);
                //End added part
                acell.children[1].textContent = title;
                tcell.children[1].textContent = title;
            }
        }
        ahm.appendChild(arow);
        thm.appendChild(trow);
    }
    document.querySelector('.scores .score.actual').textContent = Math.ceil(actualScoreTotal);
    document.querySelector('.scores .score.theoretical').textContent = '/ ' + Math.ceil(theoriticalScoreTotal);
    document.getElementById('heatmaps').style.paddingTop =
        document.getElementById('topPane').getBoundingClientRect().bottom + 'px';
    document.body.classList.toggle('oneDay', data.since === 1);
    setTextContent('#domain3rdDetails .since', data.since);
}
/* var renderPanel = function(data) {
    if ( !data ) {
        document.body.classList.add('nodata');
        return;
    }
    // 1st domain. If the domain name contains Unicode characters, we will also
    // display the plain ASCII version of the domain name.
    let domain1stUnicode = punycode.toUnicode(data.domain1st);
    document.querySelector('#domain1st > div:first-of-type').textContent = domain1stUnicode;
    if ( domain1stUnicode !== data.domain1st ) {
        document.querySelector('#domain1st > div:last-of-type').textContent = data.domain1st;
    }
    // Remember whether the heatmap must be rendered as a list.
    toggleMap(localStorage.getItem('viewAsList') === '1');
    toggleFilter(localStorage.getItem('hideBlocked') === '1');
    // Compute and render the heatmap data into HTML.
    let actualScoreTotal = 0,
        theoriticalScoreTotal = 0,
        tabConnected3rd = new Set(data.connected.tab3parties),
        allConnected3rdToCountMap = new Map(data.connected.all3pCounts),
        all3rdToCountMap = new Map(data.all.all3pCounts),
        colorTemplate = 'hsl({h}, 100%, {-l}%)'.replace('{h}', data.heatmapHue),
        reverseValue = colorTemplate.indexOf('{-l}') !== -1,
        collator = new Intl.Collator();
    // Remember authority info if available, for use in info card.
    if ( Array.isArray(data.domainToAuthorityInfo) ) {
        domainToAuthorityInfoMap = new Map(data.domainToAuthorityInfo);
    }
    // Order 3rd parties from most ubiquitous to least ubiquitous
    data.all.tab3parties.sort(function(a, b) {
        var av = all3rdToCountMap.get(a),
            bv = all3rdToCountMap.get(b);
        if ( av !== bv ) {
            return bv - av;
        }
        return collator.compare(a, b);
    });
    let hmrowTemplate = document.querySelector('#templates .hmrow'),
        cellsPerRow = hmrowTemplate.children.length,
        ahm = document.querySelector('.heatmap.actual'), arow, acell,
        thm = document.querySelector('.heatmap.theoretical'), trow, tcell,
        domain3rd, actualScore, theoreticalScore, title, value;
    for ( var ri = 0, rn = Math.ceil(data.all.tab3parties.length / cellsPerRow); ri < rn; ri++ ) {
        arow = hmrowTemplate.cloneNode(true);
        trow = hmrowTemplate.cloneNode(true);
        for ( var ci = 0; ci < cellsPerRow; ci++ ) {
            domain3rd = data.all.tab3parties[ri * cellsPerRow + ci];
            acell = arow.children[ci];
            tcell = trow.children[ci];
            if ( domain3rd ) {
                acell.setAttribute('data-domain', domain3rd);
                tcell.setAttribute('data-domain', domain3rd);
                actualScore = Math.max(
                    (allConnected3rdToCountMap.get(domain3rd) || 0) / data.all1pCount * 100,
                    1
                );
                acell.setAttribute('data-actual-score', actualScore);
                tcell.setAttribute('data-actual-score', actualScore);
                if ( tabConnected3rd.has(domain3rd) ) {
                    actualScoreTotal += actualScore;
                    value = Math.max(actualScore, 5);
                    if ( reverseValue ) { value = 100 - value; }
                    acell.children[0].style.backgroundColor = colorTemplate.replace(/\{-?l\}/, value.toFixed(0));
                } else {
                    acell.classList.add('blocked');
                }
                theoreticalScore = Math.max(
                    all3rdToCountMap.get(domain3rd) / data.all1pCount * 100,
                    1
                );
                acell.setAttribute('data-theoretical-score', theoreticalScore);
                tcell.setAttribute('data-theoretical-score', theoreticalScore);
                // TODO: still need to investigate why this can happen
                if ( isNaN(theoreticalScore) === false ) {
                    theoriticalScoreTotal += theoreticalScore;
                }
                value = Math.max(theoreticalScore, 5);
                if ( reverseValue ) { value = 100 - value; }
                tcell.children[0].style.backgroundColor = colorTemplate.replace(/\{-?l\}/, value.toFixed(0));
                title = domain3rd + ' ' + lpadNumber(actualScore, 2) + ' / ' + lpadNumber(theoreticalScore, 2);
                acell.children[1].textContent = title;
                tcell.children[1].textContent = title;
            }
        }
        ahm.appendChild(arow);
        thm.appendChild(trow);
    }
    document.querySelector('.scores .score.actual').textContent = Math.ceil(actualScoreTotal);
    document.querySelector('.scores .score.theoretical').textContent = '/ ' + Math.ceil(theoriticalScoreTotal);
    document.getElementById('heatmaps').style.paddingTop =
        document.getElementById('topPane').getBoundingClientRect().bottom + 'px';
    document.body.classList.toggle('oneDay', data.since === 1);
    setTextContent('#domain3rdDetails .since', data.since);
};
*/
/******************************************************************************/

var showDomain3rdDetails = function(cell) {
    let domain3rd = cell.getAttribute('data-domain') || undefined;
    if ( domain3rd === undefined ) { return; }
    domain3rdDetails.setAttribute('data-domain', domain3rd);
    domain3rdDetails.querySelector('span.domain').textContent = domain3rd;
    let aScore = parseFloat(cell.getAttribute('data-actual-score'));
    domain3rdDetails.querySelector('span.aExposure').textContent = Math.ceil(aScore) + '%';
    let tScore = parseFloat(cell.getAttribute('data-theoretical-score'));
    domain3rdDetails.querySelector('span.tExposure').textContent = Math.ceil(tScore) + '%';
    let authorityInfo = domainToAuthorityInfoMap.get(domain3rd);
    if ( authorityInfo !== undefined ) {
        domain3rdDetails.querySelector('#authority .category').textContent = authorityInfo.category || '';
        domain3rdDetails.querySelector('#authority .entity').textContent = authorityInfo.authority || '';
        domain3rdDetails.querySelector('#authority .details').classList.remove('hide');
    } else {
        domain3rdDetails.querySelector('#authority .details').classList.add('hide');
    }
    domain3rdDetails.classList.remove('hide');
}; 

document.body.addEventListener(
    'mouseover',
    function(ev) {
        if ( domain3rdDetails.classList.contains('sticky') ) {
            return;
        }
        let cell = lookupDownward(ev.target, '.hmcell');
        if ( cell === null ) {
            if ( lookupDownward(ev.target, '.heatmap') === null ) {
                domain3rdDetails.classList.add('hide');
            }
            return;
        }
        if ( cell.hasAttribute('data-domain') === false ) {
            domain3rdDetails.classList.add('hide');
        }
        showDomain3rdDetails(cell);
    }
);

document.body.addEventListener(
    'mouseleave',
    function(ev) {
        if ( domain3rdDetails.classList.contains('sticky') ) {
            return;
        }
        if ( !ev.relatedTarget ) {
            domain3rdDetails.classList.add('hide');
        }
    }
);

heatmaps.addEventListener(
    'click',
    function(ev) {
        let cell = lookupDownward(ev.target, '.hmcell');
        if ( cell === null ) {
            domain3rdDetails.classList.add('hide');
            return;
        }
        if ( cell.hasAttribute('data-domain') === false ) {
            domain3rdDetails.classList.remove('sticky');
            domain3rdDetails.classList.add('hide');
            return;
        }
        if (
            domain3rdDetails.classList.contains('sticky') &&
            cell.getAttribute('data-domain') === domain3rdDetails.getAttribute('data-domain')
        ) {
            domain3rdDetails.classList.remove('sticky');
        } else {
            domain3rdDetails.classList.add('sticky');
            showDomain3rdDetails(cell);
        }
    }
);

domain3rdDetails.querySelector('.removeIcon').addEventListener(
    'click',
    function() {
        domain3rdDetails.classList.remove('sticky');
        domain3rdDetails.classList.add('hide');
    }
);

/******************************************************************************/

var toggleScore = function() {
    document.body.classList.toggle('theoretical');
};

document.querySelector('.scores').addEventListener(
    'click',
    function() {
        toggleScore();
    }
);

/******************************************************************************/

var toggleMap = function(force) {
    var r = document.querySelector('#heatmaps').classList.toggle('list', force);
    localStorage.setItem('viewAsList', r ? 1 : 0);
};

document.querySelector('#heatmaps .togglerBar .togglerIcon').addEventListener(
    'click',
    function() { toggleMap(); }
);

/******************************************************************************/

var toggleFilter = function(force) {
    var r = document.querySelector('#heatmaps').classList.toggle('hideBlocked', force);
    localStorage.setItem('hideBlocked', r ? 1 : 0);
};

document.querySelector('#heatmaps .togglerBar .filterIcon').addEventListener(
    'click',
    function() { toggleFilter(); }
);

/******************************************************************************/

browser.runtime.sendMessage(
    { what: 'getHeatmapData' },
    function(response) {
        renderPanel(response);
    }
);

/******************************************************************************/

})();
