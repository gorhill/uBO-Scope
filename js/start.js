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

/* global punycode, publicSuffixList */

'use strict';

/******************************************************************************/

// Compute day-of-year
// http://stackoverflow.com/a/26426761

uBOScope.getDoY = function(date) {
    const year = date.getFullYear(),
        month = date.getMonth(),
        counts = this.isLeapYear(year) ?
            this.getDoY.dayCountLeap :
            this.getDoY.dayCount;
    return counts[month] + date.getDate();
};

uBOScope.monthFromDoY = function(year, doy) {
    const counts = this.isLeapYear(year) ?
            this.getDoY.dayCountLeap :
            this.getDoY.dayCount;
    let i = counts.length;
    while ( i-- ) {
        if ( doy >= counts[i] ) {
            return i;
        }
    }
};

uBOScope.isLeapYear = function(year) {
    return (year & 3) === 0 && (year % 100 !== 0 || year % 400 === 0);
};

uBOScope.getDoY.dayCount     = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ];
uBOScope.getDoY.dayCountLeap = [ 0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335 ];

/******************************************************************************/

// The most used function, so it better be fast.

uBOScope.hostnameFromURI = function(uri) {
    let matches = this.reCommonHostnameFromURL.exec(uri);
    if ( matches ) {
        return matches[1];
    }
    matches = this.reAuthorityFromURI.exec(uri);
    if ( !matches ) { return ''; }
    const authority = matches[1].slice(2);
    // Assume very simple authority (most common case for µBlock)
    if ( this.reHostFromNakedAuthority.test(authority) ) {
        return authority.toLowerCase();
    }
    matches = this.reHostFromAuthority.exec(authority);
    if ( !matches ) {
        matches = this.reIPv6FromAuthority.exec(authority);
        if ( !matches ) { return ''; }
    }
    // http://en.wikipedia.org/wiki/FQDN
    // Also:
    // - https://github.com/gorhill/uBlock/issues/1559
    let hostname = matches[1];
    while ( hostname.endsWith('.') ) {
        hostname = hostname.slice(0, -1);
    }
    return hostname.toLowerCase();
};

/******************************************************************************/

uBOScope.domainFromHostname = function(hostname) {
    if ( this.reIPAddressNaive.test(hostname) ) {
        return hostname;
    }
    return publicSuffixList.getDomain(hostname) ||
           publicSuffixList.getPublicSuffix(hostname);
};

/******************************************************************************/

uBOScope.domainFromURI = function(uri) {
    return this.domainFromHostname(this.hostnameFromURI(uri));
};

/******************************************************************************/

uBOScope.lookupTabEntry = function(tabDetails, timeStamp) {
    const tabEntries = tabDetails.entries;
    let i = tabEntries.length;
    if ( i === 0 ) { return; }
    if ( typeof timeStamp !== 'number' ) {
        return tabEntries[i-1];
    }
    while ( i-- ) {
        let tabEntry = tabEntries[i];
        if ( tabEntry.timeStamp <= timeStamp ) {
            return tabEntry;
        }
    }
    return tabEntries[0];
};

/******************************************************************************/

uBOScope.idFromDomain = function(domain) {
    let id = this.privexData.domainToIdMap.get(domain);
    if ( id !== undefined ) { return id; }
    do {
        id = this.privexData.domainIdGenerator++;
    } while ( this.privexData.domainToIdMap.has(id) );
    this.privexData.domainToIdMap.set(domain, id);
    this.privexData.idToDomainMap.set(id, domain);
    return id;
};

uBOScope.domainFromId = function(id) {
    return this.privexData.idToDomainMap.get(id);
};

uBOScope.connectionIdFromIds = function(leftHandId, rightHandId) {
   return leftHandId * this.lefthandOffset + rightHandId;
};

uBOScope.connectionIdFromDomains = function(domain1st, domain3rd) {
   return this.connectionIdFromIds(
        this.idFromDomain(domain3rd),
        this.idFromDomain(domain1st)
    );
};

uBOScope.rightHandIdFromConnectionId = function(connectionId) {
    return connectionId & this.righthandMask;
};

uBOScope.leftHandIdFromConnectionId = function(connectionId) {
    return connectionId / this.lefthandOffset & this.righthandMask;
        
};

uBOScope.expandArrayOfDomainIds = function(collection) {
    for ( let i = 0, n = collection.length; i < n; i++ ) {
        collection[i] = this.domainFromId(collection[i]);
    }
    return collection;
};

uBOScope.expandArrayOfDomainConnectionIds = function(collection) {
    for ( let i = 0, n = collection.length; i < n; i++ ) {
        let connectionId = collection[i];
        collection[i] = 
            this.domainFromId(this.leftHandIdFromConnectionId(connectionId)) +
            ' ' +
            this.domainFromId(this.rightHandIdFromConnectionId(connectionId));
    }
    return collection;
};

uBOScope.expandArrayOfDomainIdTuples = function(collection, i) {
    for ( let tuple of collection ) {
        tuple[i] = this.domainFromId(tuple[i]);
    }
    return collection;
};

/******************************************************************************/

uBOScope.authorityInfoFromDomainSet = function(domains) {
    let domainToAuthorityInfoMap = new Map(),
        authorityData = this.authorityData;
    for ( let domain of domains ) {
        let domainId = authorityData.stringToStringId.get(domain);
        if ( domainId === undefined ) { continue; }
        let category, authority;
        let categoryId = authorityData.domainIdToCategoryId.get(domainId);
        if ( categoryId !== undefined ) {
            category = authorityData.stringIdToString.get(categoryId);
        }
        let authorityId = authorityData.domainIdToAuthorityId.get(domainId);
        if ( authorityId !== undefined ) {
            authority = authorityData.stringIdToString.get(authorityId);
        }
        if ( category === undefined && authority === undefined ) { continue; }
        domainToAuthorityInfoMap.set(domain, { category, authority });
    }
    return domainToAuthorityInfoMap;
};

/*******************************************************************************

    Instead of losing forver the data for daily entry already in use, we move
    the data from a daybased entry about to be overwritten into the month-based
    collections. This the user will still have access to its data, though on a
    less granular basis -- month-based instead of day-based.

**/

uBOScope.mergeDailyEntryIntoMonthlyEntry = function(doy) {
    let dayEntry = this.privexData.daily.get(doy);
    if ( dayEntry === undefined ) { return; }
    let month = this.monthFromDoY(dayEntry.year, doy),
        monthId = dayEntry.year * 1000 + month,
        monthEntry = this.privexData.monthly.get(monthId);
    if ( monthEntry === undefined ) {
        monthEntry = {
            all1st: new Set(),
            allBlocked3rd: new Set(),
            allConnected3rd: new Set(),
        };
        this.privexData.monthly.set(monthId, monthEntry);
    }
    for ( let id of dayEntry.all1st ) {
        monthEntry.all1st.add(id);
    }
    for ( let id of dayEntry.allBlocked3rd ) {
        monthEntry.allBlocked3rd.add(id);
    }
    for ( let id of dayEntry.allConnected3rd ) {
        monthEntry.allConnected3rd.add(id);
    }
};

/******************************************************************************/

// All network requests are processed here.

uBOScope.processRequest = function(details, blocked) {
    const tabDetails = this.tabIdToDetailsMap.get(details.tabId);
    if ( tabDetails === undefined ) { return; }
    const tabEntry = this.lookupTabEntry(tabDetails, details.timeStamp);
    if ( tabEntry === undefined ) { return; }
    const domain1st = tabEntry.domain,
        domain1stId = this.idFromDomain(domain1st),
        domain3rd = this.domainFromURI(details.url),
        is3rd = domain3rd !== domain1st;
    // Tab-based data.
    if ( is3rd ) {
        tabEntry.all3rd.add(domain3rd);
        if ( !blocked ) {
            if ( tabEntry.allConnected3rd.has(domain3rd) === false ) {
                tabEntry.allConnected3rd.add(domain3rd);
                tabDetails.actualExposureScore = undefined;
            }
        }
    }
    // Day-based data.
    const now = new Date(details.timeStamp),
        year = now.getFullYear();
    let dirty = this.privexData.dirty,
        connectionId = this.connectionIdFromDomains(domain1st, domain3rd),
        doy = this.getDoY(now),
        dayEntry = this.privexData.daily.get(doy);
    if ( dayEntry === undefined ) {
        dayEntry = {
            year: year,
            all1st: new Set(),
            allBlocked3rd: new Set(),
            allConnected3rd: new Set()
        };
        this.privexData.daily.set(doy, dayEntry);
    } else if ( dayEntry.year !== year ) {
        this.moveDailyEntryIntoMonthlyEntry(doy);
        dayEntry.year = year;
        dayEntry.all1st.clear();
        dayEntry.allBlocked3rd.clear();
        dayEntry.allConnected3rd.clear();
    }
    if ( dayEntry.all1st.has(domain1stId) === false ) {
        dayEntry.all1st.add(domain1stId);
        dirty = true;
    }
    if ( is3rd ) {
        if ( blocked ) {
            if (
                dayEntry.allConnected3rd.has(connectionId) === false &&
                dayEntry.allBlocked3rd.has(connectionId) === false
                
            ) {
                dayEntry.allBlocked3rd.add(connectionId);
                dirty = true;
            }
        } else {
            if ( dayEntry.allConnected3rd.has(connectionId) === false ) {
                dayEntry.allBlocked3rd.delete(connectionId);
                dayEntry.allConnected3rd.add(connectionId);
                dirty = true;
            }
        }
    }
    this.privexData.dirty = dirty;
};

/******************************************************************************/

uBOScope.getCachedExposureData = function(doyNow, since) {
    const now = new Date(),
        currentYear = now.getFullYear();
    let cacheHash = currentYear * 1000000 + doyNow * 1000 + since;
    if ( cacheHash === this.cachedExposureData.hash ) {
        return this.cachedExposureData;
    }
    this.cachedExposureData.hash = cacheHash;
    const previousYear = currentYear - 1,
        doyMax = this.isLeapYear(previousYear) ? 365 : 364,
        all1stSet = new Set(),
        allConnected3rdToCountMap = new Map(),
        all3rdToCountMap = new Map();
    // Crunch for all days before current day.
    let actualSince;
    for ( let i = doyNow - since + 1; i < doyNow; i++ ) {
        let doy = i < 0 ? doyMax + i : i,
            entry = this.privexData.daily.get(doy);
        if ( entry === undefined ) { continue; }
        if ( doy <= doyNow ) {
            if ( entry.year !== currentYear ) {
                continue;
            }
        } else if ( entry.year !== previousYear ) {
            continue;
        }
        if ( actualSince === undefined ) {
            actualSince = doyNow - i + 1;
        }
        for ( let id of entry.all1st ) {
            all1stSet.add(id);
        }
        for ( let id of entry.allConnected3rd ) {
            let leftHandId = this.leftHandIdFromConnectionId(id);
            allConnected3rdToCountMap.set(
                leftHandId,
                (allConnected3rdToCountMap.get(leftHandId) || 0) + 1
            );
            all3rdToCountMap.set(
                leftHandId,
                (all3rdToCountMap.get(leftHandId) || 0) + 1
            );
        }
        for ( let id of entry.allBlocked3rd ) {
            let leftHandId = this.leftHandIdFromConnectionId(id);
            all3rdToCountMap.set(
                leftHandId,
                (all3rdToCountMap.get(leftHandId) || 0) + 1
            );
        }
    }
    this.cachedExposureData.actualSince = actualSince || 1;
    this.cachedExposureData.all1stSet = all1stSet;
    this.cachedExposureData.allConnected3rdToCountMap = allConnected3rdToCountMap;
    this.cachedExposureData.all3rdToCountMap = all3rdToCountMap;
    return this.cachedExposureData;
};

/******************************************************************************/

uBOScope.exportHeatmapData = function(tabId, since) {
    const tabDetails = this.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return; }
    const tabEntry = this.lookupTabEntry(tabDetails);
    if ( tabEntry === undefined ) { return; }
    const now = new Date(),
        doyNow = this.getDoY(now);
    if ( since === undefined ) {
        since = this.settings.daysBefore;
    }
    const cachedExposureData = this.getCachedExposureData(doyNow, since),
        all1stSet = new Set(cachedExposureData.all1stSet),
        allConnected3rdToCountMap = new Map(cachedExposureData.allConnected3rdToCountMap),
        all3rdToCountMap = new Map(cachedExposureData.all3rdToCountMap),
        entry = this.privexData.daily.get(doyNow);
    if ( entry ) {
        for ( let id of entry.all1st ) {
            all1stSet.add(id);
        }
        for ( let id of entry.allConnected3rd ) {
            let leftHandId = this.leftHandIdFromConnectionId(id);
            allConnected3rdToCountMap.set(
                leftHandId,
                (allConnected3rdToCountMap.get(leftHandId) || 0) + 1
            );
            all3rdToCountMap.set(
                leftHandId,
                (all3rdToCountMap.get(leftHandId) || 0) + 1
            );
        }
        for ( let id of entry.allBlocked3rd ) {
            let leftHandId = this.leftHandIdFromConnectionId(id);
            all3rdToCountMap.set(
                leftHandId,
                (all3rdToCountMap.get(leftHandId) || 0) + 1
            );
        }
    }
    return {
        all1pCount: all1stSet.size,
        domain1st: tabEntry.domain,
        since: cachedExposureData.actualSince || since,
        heatmapHue: this.settings.heatmapHue,
        domainToAuthorityInfo: Array.from(this.authorityInfoFromDomainSet(tabEntry.all3rd)),
        connected: {
            tab3parties: Array.from(tabEntry.allConnected3rd),
            all3pCounts: this.expandArrayOfDomainIdTuples(Array.from(allConnected3rdToCountMap), 0),
        },
        all: {
            tab3parties: Array.from(tabEntry.all3rd),
            all3pCounts: this.expandArrayOfDomainIdTuples(Array.from(all3rdToCountMap), 0),
        },
    };
};

/******************************************************************************/

uBOScope.queryExposureScore = function(tabId, since) {
    const tabDetails = this.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return; }
    if ( tabDetails.actualExposureScore !== undefined ) {
        return tabDetails.actualExposureScore;
    }
    const tabEntry = this.lookupTabEntry(tabDetails);
    if ( tabEntry === undefined ) { return; }
    const now = new Date(),
        doyNow = this.getDoY(now);
    if ( since === undefined ) {
        since = this.settings.daysBefore;
    }
    let cachedExposureData = this.getCachedExposureData(doyNow, since),
        all1stSet = new Set(cachedExposureData.all1stSet),
        allConnected3rdToCountMap = new Map(cachedExposureData.allConnected3rdToCountMap),
        entry = this.privexData.daily.get(doyNow);
    if ( entry ) {
        for ( let id of entry.all1st ) {
            all1stSet.add(id);
        }
        for ( let id of entry.allConnected3rd ) {
            let leftHandId = this.leftHandIdFromConnectionId(id);
            allConnected3rdToCountMap.set(
                leftHandId,
                (allConnected3rdToCountMap.get(leftHandId) || 0) + 1
            );
        }
    }
    let exposureScore = 0,
        tabConnected3rd = tabEntry.allConnected3rd;
    for ( let domain of tabConnected3rd ) {
        exposureScore += Math.max(
            allConnected3rdToCountMap.get(this.idFromDomain(domain)) / all1stSet.size,
            0.01
        );
    }
    exposureScore *= 100;
    tabDetails.actualExposureScore = exposureScore;
    return exposureScore;
};

/******************************************************************************/

uBOScope.exportDataFromPrivexData = function() {
    let privexData = this.privexData,
        manifest = self.browser.runtime.getManifest();
    let exportData = {
        source: manifest.name,
        version: manifest.version,
        domainIdGenerator: privexData.domainIdGenerator,
        domainToIdMap: Array.from(privexData.domainToIdMap),
        monthly: [],
        daily: [],
    };
    let monthly = exportData.monthly;
    for ( let [monthId, entry] of privexData.monthly ) {
        monthly.push([monthId, {
            all1st: Array.from(entry.all1st),
            allBlocked3rd: Array.from(entry.allBlocked3rd),
            allConnected3rd: Array.from(entry.allConnected3rd),
        }]);
    }
    let daily = exportData.daily;
    for ( let [doy, entry] of privexData.daily ) {
        daily.push([doy, {
            year: entry.year,
            all1st: Array.from(entry.all1st),
            allBlocked3rd: Array.from(entry.allBlocked3rd),
            allConnected3rd: Array.from(entry.allConnected3rd),
        }]);
    }
    return exportData;
};

/******************************************************************************/

uBOScope.privexDataFromExportData = function(exportData) {
    exportData.domainToIdMap = new Map(exportData.domainToIdMap);
    let idToDomainMap = new Map();
    for ( let [domain, id] of exportData.domainToIdMap ) {
        idToDomainMap.set(id, domain);
    }
    exportData.idToDomainMap = idToDomainMap;
    let monthly = new Map();
    for ( let [monthId, entry] of exportData.monthly ) {
        monthly.set(monthId, {
            all1st: new Set(entry.all1st),
            allBlocked3rd: new Set(entry.allBlocked3rd),
            allConnected3rd: new Set(entry.allConnected3rd),
        });
    }
    exportData.monthly = monthly;
    let daily = new Map();
    for ( let [doy, entry] of exportData.daily ) {
        daily.set(doy, {
            year: entry.year,
            all1st: new Set(entry.all1st),
            allBlocked3rd: new Set(entry.allBlocked3rd),
            allConnected3rd: new Set(entry.allConnected3rd),
        });
    }
    exportData.daily = daily;
    return exportData;
};

/******************************************************************************/

uBOScope.expandExportData = function(exportData) {
    let monthly = exportData.monthly;
    for ( let i = 0, n = monthly.length; i < n; i++ ) {
        let tuple = monthly[i];
        this.expandArrayOfDomainIds(tuple[1].all1st).sort();
        this.expandArrayOfDomainConnectionIds(tuple[1].allBlocked3rd).sort();
        this.expandArrayOfDomainConnectionIds(tuple[1].allConnected3rd).sort();
    }
    let daily = exportData.daily;
    for ( let i = 0, n = daily.length; i < n; i++ ) {
        let tuple = daily[i];
        this.expandArrayOfDomainIds(tuple[1].all1st).sort();
        this.expandArrayOfDomainConnectionIds(tuple[1].allBlocked3rd).sort();
        this.expandArrayOfDomainConnectionIds(tuple[1].allConnected3rd).sort();
    }
    // When we expand the data, these fields are no longer needed.
    exportData.domainIdGenerator = undefined;
    exportData.domainToIdMap = undefined;
    return exportData;
};

/******************************************************************************/

uBOScope.savePrivexData = function(force) {
    if ( this.privexData.dirty === false && !force ) { return; }
    this.privexData.dirty = false;
    self.browser.storage.local.set({
        privexData: this.exportDataFromPrivexData()
    });
};

/******************************************************************************/

uBOScope.loadPrivexData = function(callback) {
    if ( typeof callback !== 'function' ) {
        callback = this.noopFunc;
    }   
    self.browser.storage.local.get('privexData', (bin) => {
        if ( self.browser.runtime.lastError || !bin || !bin.privexData ) {
            callback();
            return;
        }
        var privexData = this.privexDataFromExportData(bin.privexData);
        if ( this.privexData.domainIdGenerator < privexData.domainIdGenerator ) {
            this.privexData.domainIdGenerator = privexData.domainIdGenerator;
        }
        this.privexData.domainToIdMap = privexData.domainToIdMap;
        this.privexData.idToDomainMap = privexData.idToDomainMap;
        this.privexData.monthly = privexData.monthly;
        this.privexData.daily = privexData.daily;
        this.privexData.dirty = false;
        callback();
    });
};

/******************************************************************************/

uBOScope.exportPrivexData = function() {
    let exportData = this.expandExportData(this.exportDataFromPrivexData());
    let a = document.createElement('a');
    a.type = 'text/plain';
    a.target = '_blank';
    a.href = URL.createObjectURL(new Blob(
        [ JSON.stringify(exportData, null, '\t') ],
        { type: 'text/plain;charset=utf-8', endings: 'native' }
    ));
    a.setAttribute('download', 'my-uboscope-data.txt');
    a.dispatchEvent(new MouseEvent('click'));
};

/******************************************************************************/

uBOScope.saveSettings = function() {
    self.browser.storage.local.set({ settings: this.settings });
};

/******************************************************************************/

uBOScope.loadSettings = function() {
    self.browser.storage.local.get('settings', bin => {
        if (
            self.browser.runtime.lastError ||
            bin instanceof Object === false ||
            bin.settings instanceof Object === false
        ) {
            return;
        }
        this.settings = bin.settings;
        this.cachedExposureData.hash = undefined;
    });
};

/******************************************************************************/

uBOScope.loadPublicSuffixList = function(callback) {
    const me = this,
        assetKey = this.pslAssetKey,
        compiledAssetKey = 'compiled/' + assetKey;
    if ( typeof callback !== 'function' ) {
        callback = this.noopFunc;
    }
    const compileList = function(content) {
        publicSuffixList.parse(content, punycode.toASCII);
        me.assets.put(
            compiledAssetKey,
            JSON.stringify(publicSuffixList.toSelfie())
        );
    };
    const onRawListLoaded = function(details) {
        if ( details.content !== '' ) {
            compileList(details.content);
        }
        callback();
    };
    const onCompiledListLoaded = function(details) {
        if ( details.content === '' ) {
            me.assets.get(assetKey, onRawListLoaded);
            return;
        }
        publicSuffixList.fromSelfie(JSON.parse(details.content));
        callback();
    };
    this.assets.get(compiledAssetKey, onCompiledListLoaded);
};

/******************************************************************************/

uBOScope.loadDisconnectTrackingProtectionData = function(callback) {
    const ubo = this,
        assetKey = this.dtpAssetKey,
        compiledAssetKey = 'compiled/' + assetKey;
    if ( typeof callback !== 'function' ) {
        callback = this.noopFunc;
    }
    const compileList = function(content) {
        let data;
        try {
            data = JSON.parse(content);
        } catch (ex) {
        }
        if ( data instanceof Object === false ) { return; }
        let categories = data.categories;
        if ( categories instanceof Object === false ) { return; }
        let idGenerator = 1,
            stringToStringId = new Map(),
            stringIdToString = new Map(),
            domainIdToCategoryId = new Map(),
            domainIdToAuthorityId = new Map(),
            authorityName, authorityURL, authorityDomains, id, name;
        for ( let category in categories ) {
            if ( categories.hasOwnProperty(category) === false ) { continue; }
            let categoryName = category.toLowerCase();
            let authorities = categories[category];
            for ( let authority of authorities ) {
                for ( authorityName in authority ) {
                    if ( authority.hasOwnProperty(authorityName) === false ) {
                        continue;
                    }
                    break;
                }
                if ( authority[authorityName] instanceof Object === false ) {
                    continue;
                }
                for ( authorityURL in authority[authorityName] ) {
                    if ( authority[authorityName].hasOwnProperty(authorityURL) === false ) {
                        continue;
                    }
                    authorityDomains = authority[authorityName][authorityURL];
                    break;
                }
                if ( Array.isArray(authorityDomains) === false ) {
                    continue;
                }
                for ( let domain of authorityDomains ) {
                    let domainId = stringToStringId.get(domain);
                    if ( domainId === undefined ) {
                        domainId = idGenerator++;
                        stringToStringId.set(domain, domainId);
                        stringIdToString.set(domainId, domain);
                    }
                    // category
                    if ( categoryName !== 'disconnect' ) {
                        id = domainIdToCategoryId.get(domainId);
                        name = categoryName;
                        if ( id !== undefined && id !== stringToStringId.get(name) ) {
                            name = stringIdToString.get(id) + ', ' + name;
                        }
                        let categoryId = stringToStringId.get(name);
                        if ( categoryId === undefined ) {
                            categoryId = idGenerator++;
                            stringToStringId.set(name, categoryId);
                            stringIdToString.set(categoryId, name);
                        }
                        domainIdToCategoryId.set(domainId, categoryId);
                    }
                    // authority
                    id = domainIdToAuthorityId.get(domainId);
                    name = authorityName;
                    if ( id !== undefined && id !== stringToStringId.get(name) ) {
                        name = stringIdToString.get(id) + ' a.k.a. ' + name;
                    }
                    let authorityId = stringToStringId.get(name);
                    if ( authorityId === undefined ) {
                        authorityId = idGenerator++;
                        stringToStringId.set(name, authorityId);
                        stringIdToString.set(authorityId, name);
                    }
                    domainIdToAuthorityId.set(domainId, authorityId);
                }
            }
        }
        ubo.authorityData = {
            stringToStringId: stringToStringId,
            stringIdToString: stringIdToString,
            domainIdToCategoryId: domainIdToCategoryId,
            domainIdToAuthorityId: domainIdToAuthorityId,
        };
        ubo.assets.put(
            compiledAssetKey,
            JSON.stringify({
                stringToStringId: Array.from(stringToStringId),
                stringIdToString: Array.from(stringIdToString),
                domainIdToCategoryId: Array.from(domainIdToCategoryId),
                domainIdToAuthorityId: Array.from(domainIdToAuthorityId),
            })
        );
    };
    const onRawListLoaded = function(details) {
        if ( details.content !== '' ) {
            compileList(details.content);
        }
        callback();
    };
    const onCompiledListLoaded = function(details) {
        if ( details.content === '' ) {
            ubo.assets.get(assetKey, onRawListLoaded);
            return;
        }
        let data;
        try {
            data = JSON.parse(details.content);
        } catch (ex) {
        }
        if ( data instanceof Object === false ) {
            return;
        }
        ubo.authorityData = {
            stringToStringId: new Map(data.stringToStringId),
            stringIdToString: new Map(data.stringIdToString),
            domainIdToCategoryId: new Map(data.domainIdToCategoryId),
            domainIdToAuthorityId: new Map(data.domainIdToAuthorityId),
        };
        callback();
    };
    this.assets.get(compiledAssetKey, onCompiledListLoaded);
};

/******************************************************************************/

uBOScope.start = function() {
    let ubo = this,
        requestIds = new Map();

    this.tabIdToDetailsMap.set(-1, {
        entries: [
            {
                timeStamp: 0,
                domain: 'behind-the-scene',
                allBlocked3rd: new Set(),
                allConnected3rd: new Set(),
                all3rd: new Set(),
            }
        ]
    });

    let updateTabBadge = (function() {
        const updateScore = function(tabId) {
            let exposureScore,
                tabDetails = this.tabIdToDetailsMap.get(tabId);
            if ( tabDetails ) {
                tabDetails.updateBadgeTimer = undefined;
                exposureScore = this.queryExposureScore(tabId, this.settings.daysBefore);
            }
            self.browser.browserAction.setBadgeText({
                tabId: tabId,
                text: typeof exposureScore === 'number' ? Math.ceil(exposureScore).toFixed(0) : ''
            });
        };
        return function(tabId) {
            if ( tabId === -1 ) { return; }
            const tabDetails = ubo.tabIdToDetailsMap.get(tabId);
            if (
                tabDetails !== undefined &&
                tabDetails.actualExposureScore === undefined &&
                tabDetails.updateBadgeTimer === undefined
            ) {
                tabDetails.updateBadgeTimer = setTimeout(
                    updateScore.bind(ubo, tabId),
                    751
                );
            }
        };
    })();

    self.browser.tabs.onRemoved.addListener(function(tabId) {
        const tabDetails = ubo.tabIdToDetailsMap.get(tabId);
        if ( tabDetails === undefined ) { return; }
        if ( tabDetails.updateBadgeTimer ) {
            clearTimeout(tabDetails.updateBadgeTimer);
            tabDetails.updateBadgeTimer = undefined;
        }
        ubo.tabIdToDetailsMap.delete(tabId);
    });

    self.browser.webRequest.onSendHeaders.addListener(
        function(details) {
            requestIds.set(details.requestId, details.timeStamp);
            if (
                details.tabId === -1 ||
                details.parentFrameId !== -1 ||
                details.type !== 'main_frame'
            ) {
                return;
            }
            let tabDetails = ubo.tabIdToDetailsMap.get(details.tabId);
            if ( tabDetails === undefined ) {
                tabDetails = {
                    actualExposureScore: undefined,
                    entries: [],
                    updateBadgeTimer: undefined,
                };
                ubo.tabIdToDetailsMap.set(details.tabId, tabDetails);
            }
            if ( tabDetails.entries.length === 5 ) {
                tabDetails.entries.splice(0, 1);
            }
            tabDetails.entries[tabDetails.entries.length] = {
                timeStamp: details.timeStamp,
                domain: ubo.domainFromURI(details.url),
                allBlocked3rd: new Set(),
                allConnected3rd: new Set(),
                all3rd: new Set(),
            };
            tabDetails.actualExposureScore = undefined;
            updateTabBadge(details.tabId);
        },
        { urls: [ '<all_urls>' ] }
    );

    // When there is no matching request entry, this means a request was 
    // redirected to  a data: URI by an extension.
    // See <https://developer.chrome.com/extensions/webRequest>.
    self.browser.webRequest.onBeforeRedirect.addListener(
        function(details) {
            if ( requestIds.has(details.requestId) === false ) {
                requestIds.delete(details.requestId);
                ubo.processRequest(details, true);
                updateTabBadge(details.tabId);
            }
        },
        { urls: [ '<all_urls>' ] }
    );

    let onCompleted = function(details) {
        if ( !details.statusCode && details.fromCache ) {
            console.log(details.url);
        }
        let timeStamp = requestIds.get(details.requestId);
        if ( timeStamp ) { details.timeStamp = timeStamp; }
        requestIds.delete(details.requestId);
        ubo.processRequest(details, timeStamp === undefined || !details.statusCode);
        updateTabBadge(details.tabId);
    };

    self.browser.webRequest.onCompleted.addListener(
        onCompleted,
        { urls: [ '<all_urls>' ] }
    );

    self.browser.webRequest.onErrorOccurred.addListener(
        onCompleted,
        { urls: [ '<all_urls>' ] }
    );

    self.browser.runtime.onMessage.addListener(
        function(details, sender, callback) {
            let what = details instanceof Object ? details.what : undefined;
            if ( typeof callback !== 'function' ) {
                callback = ubo.noopFunc;
            }
            let response;
            switch ( what ) {
            case 'doExportData':
                ubo.exportPrivexData();
                break;
            case 'getDaysBefore':
                response = ubo.settings.daysBefore;
                break;
            case 'getHeatmapHue':
                response = ubo.settings.heatmapHue;
                break;
            case 'getHeatmapData':
                self.browser.tabs.query({ active: true }, function(tabs) {
                    if ( tabs && tabs.length !== 0 ) {
                        response = ubo.exportHeatmapData(tabs[0].id);
                    }
                    callback(response);
                });
                return true;
            case 'getStorageUsed':
                self.browser.storage.local.getBytesInUse('privexData', function(used) {
                    callback(used);
                });
                return true;
            case 'setDaysBefore':
                if ( typeof details.value === 'number' ) {
                    ubo.settings.daysBefore = details.value;
                    ubo.cachedExposureData.hash = undefined;
                    ubo.saveSettings();
                }
                break;
            case 'setHeatmapHue':
                if ( typeof details.value === 'number' ) {
                    ubo.settings.heatmapHue = Math.max(0, Math.min(360, details.value));
                    ubo.saveSettings();
                }
                break;
            default:
                break;
            }
            callback(response);
        }
    );

    self.browser.alarms.create('savePrivexData', { periodInMinutes: 5 });

    self.browser.alarms.onAlarm.addListener(function(details) {
        if ( details.name === 'savePrivexData' ) {
            ubo.savePrivexData();
            return;
        }
    });

    // This can be done lazily
    ubo.loadSettings();
    ubo.loadDisconnectTrackingProtectionData();
};

/******************************************************************************/

(function() {
    let ubo = uBOScope,
        countdown = 2;
    let onDone = function() {
        countdown -= 1;
        if ( countdown === 0 ) {
            ubo.start();
        }
    };
    ubo.loadPublicSuffixList(onDone);
    ubo.loadPrivexData(onDone);
})();

/******************************************************************************/
