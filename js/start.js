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
    if ( date === undefined ) {
        date = new Date();
    }
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
    this.mustSave(this.DIRTY_DOMAIN_TO_ID_MAP);
    return id;
};

uBOScope.domainFromId = function(id) {
    return this.privexData.idToDomainMap.get(id);
};

uBOScope.connectionIdFromIds = function(leftHandId, rightHandId) {
   return leftHandId * this.lefthandOffset + rightHandId;
};

uBOScope.connectionIdFromDomains = function(domain3rd, domain1st) {
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

    // Time-based data
    const dateNow = new Date(),
        yearNow = dateNow.getFullYear(),
        connectionId = this.connectionIdFromDomains(domain3rd, domain1st);

    // Month-based data.
    const monthNow = dateNow.getMonth(),
        monthIdNow = yearNow * 1000 + monthNow;
    let monthEntry = this.privexData.monthly.get(monthIdNow);
    if ( monthEntry === undefined ) {
        monthEntry = {
            all1st: new Set(),
            allBlocked3rd: new Set(),
            allConnected3rd: new Set()
        };
        this.privexData.monthly.set(monthIdNow, monthEntry);
    }
    if ( monthEntry.all1st.has(domain1stId) === false ) {
        monthEntry.all1st.add(domain1stId);
        this.mustSave(this.DIRTY_MONTHLY_MAP);
    }
    if ( is3rd ) {
        if ( blocked ) {
            if (
                monthEntry.allConnected3rd.has(connectionId) === false &&
                monthEntry.allBlocked3rd.has(connectionId) === false
                
            ) {
                monthEntry.allBlocked3rd.add(connectionId);
                this.mustSave(this.DIRTY_MONTHLY_MAP);
            }
        } else if ( monthEntry.allConnected3rd.has(connectionId) === false ) {
            monthEntry.allBlocked3rd.delete(connectionId);
            monthEntry.allConnected3rd.add(connectionId);
            this.mustSave(this.DIRTY_MONTHLY_MAP);
        }
    }

    // Day-based data.
    const doyNow = this.getDoY(dateNow);
    let dayEntry = this.privexData.daily.get(doyNow);
    if ( dayEntry === undefined ) {
        dayEntry = {
            year: yearNow,
            all1st: new Set(),
            allBlocked3rd: new Set(),
            allConnected3rd: new Set()
        };
        this.privexData.daily.set(doyNow, dayEntry);
    } else if ( dayEntry.year !== yearNow ) {
        dayEntry.year = yearNow;
        dayEntry.all1st.clear();
        dayEntry.allBlocked3rd.clear();
        dayEntry.allConnected3rd.clear();
    }
    if ( dayEntry.all1st.has(domain1stId) === false ) {
        dayEntry.all1st.add(domain1stId);
        this.mustSave(this.DIRTY_DAILY_MAP);
    }
    if ( is3rd ) {
        if ( blocked ) {
            if (
                dayEntry.allConnected3rd.has(connectionId) === false &&
                dayEntry.allBlocked3rd.has(connectionId) === false
                
            ) {
                dayEntry.allBlocked3rd.add(connectionId);
                this.mustSave(this.DIRTY_DAILY_MAP);
            }
        } else if ( dayEntry.allConnected3rd.has(connectionId) === false ) {
            dayEntry.allBlocked3rd.delete(connectionId);
            dayEntry.allConnected3rd.add(connectionId);
            this.mustSave(this.DIRTY_DAILY_MAP);
        }
    }
};

/*******************************************************************************

    Caches of number-crunched data from immutable data sources. The data for
    all the days before today is immutable -- it won't ever change. Hence
    whatever can be number-crunched in advance will be cached here.

**/

uBOScope.getCachedExposureData = (function() {
    let cachedData = {
        hash: undefined,
        actualSince: undefined,
        all1stSet: undefined,
        allConnected3rdToCountMap: undefined,
        all3rdToCountMap: undefined,
    };

    let numberCrunch = function(details, bin) {
        let { doyNow, since, currentYear, previousYear, doyMax, callback } = details,
            actualSince,
            all1stSet = new Set(),
            allConnected3rdToCountMap = new Map(),
            all3rdToCountMap = new Map();
        for ( let i = doyNow - since + 1; i < doyNow; i++ ) {
            let doy = i < 0 ? doyMax + i : i,
                entry = this.privexData.daily.get(doy) ||
                        bin['daily-' + doy];
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
        cachedData.hash = currentYear * 1000000 + doyNow * 1000 + since;
        cachedData.actualSince = actualSince || 1;
        cachedData.all1stSet = all1stSet;
        cachedData.allConnected3rdToCountMap = allConnected3rdToCountMap;
        cachedData.all3rdToCountMap = all3rdToCountMap;
        callback(cachedData);
    };

    return function(doyNow, since, callback) {
        const now = new Date(),
            currentYear = now.getFullYear();
        let cacheHash = currentYear * 1000000 + doyNow * 1000 + since;
        if ( cacheHash === cachedData.hash ) {
            return callback(cachedData);
        }
        const previousYear = currentYear - 1,
            doyMax = this.isLeapYear(previousYear) ? 365 : 364;
        // Load all daily data not yet in memory.
        let storageKeys = [];
        for ( let i = doyNow - since + 1; i < doyNow; i++ ) {
            storageKeys.push('daily-' + (i < 0 ? doyMax + i : i));
        }
        if ( storageKeys.length === 0 ) {
            return callback();
        }
        self.browser.storage.local.get(
            storageKeys,
            numberCrunch.bind(this, { doyNow, since, currentYear, previousYear, doyMax, callback })
        );
    };
})();

/******************************************************************************/

uBOScope.exportHeatmapData = function(tabId, since, callback) {
    if ( typeof since === 'function' ) {
        callback = since;
        since = undefined;
    }

    const tabDetails = this.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return callback(); }
    const tabEntry = this.lookupTabEntry(tabDetails);
    if ( tabEntry === undefined ) { return callback(); }

    const now = new Date(),
        doyNow = this.getDoY(now);
    if ( since === undefined ) {
        since = this.settings.daysBefore;
    }

    this.getCachedExposureData(doyNow, since, cachedData => {
        let all1stSet = new Set(cachedData && cachedData.all1stSet),
            allConnected3rdToCountMap = new Map(cachedData && cachedData.allConnected3rdToCountMap),
            all3rdToCountMap = new Map(cachedData && cachedData.all3rdToCountMap);
        let entry = this.privexData.daily.get(doyNow);
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
        callback({
            all1pCount: all1stSet.size,
            domain1st: tabEntry.domain,
            since: cachedData && cachedData.actualSince || since,
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
        });
    });
};

/******************************************************************************/

uBOScope.queryExposureScore = function(tabId, since, callback) {
    const tabDetails = this.tabIdToDetailsMap.get(tabId);
    if ( tabDetails === undefined ) { return callback(); }
    if ( tabDetails.actualExposureScore !== undefined ) {
        return callback(tabDetails.actualExposureScore);
    }
    const tabEntry = this.lookupTabEntry(tabDetails);
    if ( tabEntry === undefined ) { return callback(); }

    const now = new Date(),
        doyNow = this.getDoY(now);
    if ( since === undefined ) {
        since = this.settings.daysBefore;
    }

    this.getCachedExposureData(doyNow, since, cachedData => {
        let all1stSet = new Set(cachedData && cachedData.all1stSet),
            allConnected3rdToCountMap = new Map(cachedData && cachedData.allConnected3rdToCountMap);
        let entry = this.privexData.daily.get(doyNow);
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
        callback(exposureScore);
    });
};

/******************************************************************************/

uBOScope.exportDataFromPrivexData = function(callback) {
    // Be sure all changes are committed to the storage
    this.savePrivexData();

    // Read all data to be exported
    let manifest = self.browser.runtime.getManifest();
    let exportData = {
        source: manifest.name,
        version: manifest.version,
    };
    let storageKeys = [];

    // monthly data
    let { monthIdMin, monthIdMax } = this.privexData.monthlyMetadata,
        monthId = monthIdMin;
    while ( monthId <= monthIdMax ) {
        storageKeys.push('monthly-' + monthId);
        monthId += 1;
        if ( monthId % 1000 > 11 ) {
            monthId = Math.round(monthId / 1000) + 1000;
        }
    }

    // daily data
    for ( let doy = 0; doy < 366; doy++ ) {
        storageKeys.push('daily-' + doy);
    }
    self.browser.storage.local.get(storageKeys, bin => {
        for ( let key of Object.keys(bin).sort() ) {
            let entry = bin[key];
            this.expandArrayOfDomainIds(entry.all1st).sort();
            this.expandArrayOfDomainConnectionIds(entry.allBlocked3rd).sort();
            this.expandArrayOfDomainConnectionIds(entry.allConnected3rd).sort();
            exportData[key] = entry;
        }
        callback(exportData);
    });
};

/*******************************************************************************

    https://github.com/gorhill/uBO-Scope/issues/2
    0.1.1 and below:
    - 'privexData': all data
    0.1.5 and above:
    - 'domainToIdMap': data to transpose base domain name into unique integer id.
    - 'daily-[doy]: day-of-year daily-based data.
    - 'monthly-[monthId]: monthly-based data.
    - 'monthly-metadata': metadata for the monthly data.

    Storing things this way allows for a more efficient piecemeal approach
    when there is a need to save 3rd-party exposure data.

**/

uBOScope.savePrivexData = function(force) {
    if ( this.mustSaveBits === 0 && !force ) { return; }
    let bin = {},
        dateNow = new Date(),
        yearNow = dateNow.getFullYear(),
        monthNow = dateNow.getMonth(),
        monthIdNow = yearNow * 1000 + monthNow,
        doyNow = this.getDoY(dateNow);

    if ( this.mustSaveBits & this.DIRTY_DOMAIN_TO_ID_MAP ) {
        bin['domainToIdMap'] = Array.from(this.privexData.domainToIdMap);
    }

    if ( this.mustSaveBits & this.DIRTY_MONTHLY_MAP ) {
        let { monthIdMin, monthIdMax } = this.privexData.monthlyMetadata;
        for ( let [ monthId, entry ] of this.privexData.monthly ) {
            bin['monthly-' + monthId] = {
                all1st: Array.from(entry.all1st),
                allBlocked3rd: Array.from(entry.allBlocked3rd),
                allConnected3rd: Array.from(entry.allConnected3rd),
            };
            if ( monthIdMin > monthId ) { monthIdMin = monthId; }
            if ( monthIdMax < monthId ) { monthIdMax = monthId; }
            if ( monthId !== monthIdNow ) {
                this.privexData.monthly.delete(monthId);
            }
        }
        bin['monthly-metadata'] = { monthIdMin, monthIdMax };
    }

    if ( this.mustSaveBits & this.DIRTY_DAILY_MAP ) {
        for ( let [ doy, entry ] of this.privexData.daily ) {
            bin['daily-' + doy] = {
                year: entry.year,
                all1st: Array.from(entry.all1st),
                allBlocked3rd: Array.from(entry.allBlocked3rd),
                allConnected3rd: Array.from(entry.allConnected3rd),
            };
            if ( doy !== doyNow ) {
                this.privexData.daily.delete(doy);
            }
        }
    }

    this.mustSaveBits = 0;
    self.browser.storage.local.set(bin);
};

/******************************************************************************/

// This ugly code below can be scraped once everybody moved to the
// new storage layout.

uBOScope.migrateStorage = function(callback) { 

    let createMonthlyData = function(bin) {
        if ( bin && bin['monthly-metadata'] ) {
            callback();
            return;
        }
        let storageKeys = [];
        for ( let doy = 0; doy < 366; doy++ ) {
            storageKeys.push('daily-' + doy);
        }
        self.browser.storage.local.get(storageKeys, binin => {
            if ( !binin ) {
                callback();
                return;
            }
            let binout = {},
                monthIdMin = Number.MAX_SAFE_INTEGER,
                monthIdMax = Number.MIN_SAFE_INTEGER;
            for ( let key in binin ) {
                let match = /^daily-(\d+)/.exec(key);
                if ( match === null ) { continue; }
                let doy = parseInt(match[1], 10),
                    doyEntry = binin[key];
                let month = this.monthFromDoY(doyEntry.year, doy),
                    monthId = doyEntry.year * 1000 + month,
                    monthEntry = binout['monthly-' + monthId];
                if ( monthEntry === undefined ) {
                    monthEntry = {
                        all1st: [],
                        allBlocked3rd: [],
                        allConnected3rd: [],
                    };
                    binout['monthly-' + monthId] = monthEntry;
                }
                monthEntry.all1st = Array.from(new Set(monthEntry.all1st.concat(doyEntry.all1st)));
                monthEntry.allBlocked3rd = Array.from(new Set(monthEntry.allBlocked3rd.concat(doyEntry.allBlocked3rd)));
                monthEntry.allConnected3rd = Array.from(new Set(monthEntry.allConnected3rd.concat(doyEntry.allConnected3rd)));
                if ( monthIdMin > monthId ) {
                    monthIdMin = monthId;
                }
                if ( monthIdMax < monthId ) {
                    monthIdMax = monthId;
                }
            }
            binout['monthly-metadata'] = this.privexData.monthlyMetadata =  { monthIdMin, monthIdMax };
            self.browser.storage.local.set(binout, () => {
                callback();
            });
        });
    };

    self.browser.storage.local.get([ 'privexData' ], binin => {
        if ( self.browser.runtime.lastError || !binin || !binin.privexData ) {
            callback();
            return;
        }

        let binout = {};

        if ( binin.privexData.domainToIdMap ) {
            binout.domainToIdMap = binin.privexData.domainToIdMap;
        }

        if ( binin.privexData.daily ) {
            for ( let [doy, entry] of binin.privexData.daily ) {
                binout['daily-' + doy] = entry;
            }
        }

        self.browser.storage.local.set(binout, () => {
            self.browser.storage.local.remove('privexData');
            self.browser.storage.local.get('monthly-metadata', bin => {
                createMonthlyData.call(this, bin);
            });
        });
    });
};

/******************************************************************************/

uBOScope.loadPrivexData = function(callback) {
    if ( typeof callback !== 'function' ) {
        callback = this.noopFunc;
    }

    this.migrateStorage(() => {
        let dateNow = new Date(),
            yearNow = dateNow.getFullYear(),
            monthNow = dateNow.getMonth(),
            monthIdNow = yearNow * 1000 + monthNow,
            monthIdStorageKey = 'monthly-' + monthIdNow,
            doyNow = this.getDoY(dateNow),
            doyStorageKey = 'daily-' + doyNow;
        let storageKeys = [
            'domainToIdMap',
            doyStorageKey,
            monthIdStorageKey,
            'monthly-metadata',
        ];
        self.browser.storage.local.get(storageKeys, bin => {
            if ( self.browser.runtime.lastError || !bin ) {
                callback();
                return;
            }

            this.mustSaveBits = 0;

            if ( bin.domainToIdMap ) {
                this.privexData.domainToIdMap = new Map(bin.domainToIdMap);
                this.privexData.domainIdGenerator = this.privexData.domainToIdMap.size;
                let idToDomainMap = new Map();
                for ( let [domain, id] of this.privexData.domainToIdMap ) {
                    idToDomainMap.set(id, domain);
                }
                this.privexData.idToDomainMap = idToDomainMap;
            }

            let doyEntry = bin[doyStorageKey];
            if ( doyEntry ) {
                this.privexData.daily.set(doyNow, {
                    year: doyEntry.year,
                    all1st: new Set(doyEntry.all1st),
                    allBlocked3rd: new Set(doyEntry.allBlocked3rd),
                    allConnected3rd: new Set(doyEntry.allConnected3rd),
                });
            }

            let monthEntry = bin[monthIdStorageKey];
            if ( monthEntry ) {
                this.privexData.monthly.set(monthIdNow, {
                    all1st: new Set(monthEntry.all1st),
                    allBlocked3rd: new Set(monthEntry.allBlocked3rd),
                    allConnected3rd: new Set(monthEntry.allConnected3rd),
                });
            }

            if ( bin['monthly-metadata'] ) {
                this.privexData.monthlyMetadata = bin['monthly-metadata'];
            }

            callback();
        });
    });
};

/******************************************************************************/

uBOScope.exportPrivexData = function() {
    this.exportDataFromPrivexData(exportData => {
        let a = document.createElement('a');
        a.type = 'text/plain';
        a.target = '_blank';
        a.href = URL.createObjectURL(new Blob(
            [ JSON.stringify(exportData, null, '\t') ],
            { type: 'text/plain;charset=utf-8', endings: 'native' }
        ));
        a.setAttribute('download', 'my-uboscope-data.txt');
        a.dispatchEvent(new MouseEvent('click'));
    });
};

/******************************************************************************/

uBOScope.mustSave = function(bits) {
    this.mustSaveBits |= bits;
    if ( this.mustSaveTimer === false ) {
        this.mustSaveTimer = true;
        self.browser.alarms.create('savePrivexData', { delayInMinutes: 1 });
    }
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

    let setBadgeText = function(tabId, score) {
        self.browser.browserAction.setBadgeText({
            tabId: tabId,
            text: typeof score === 'number' ? Math.ceil(score).toFixed(0) : ''
        });
    };

    const updateTabBadgeAsync = function(tabId) {
        let tabDetails = this.tabIdToDetailsMap.get(tabId);
        if ( tabDetails ) {
            tabDetails.updateBadgeTimer = undefined;
            this.queryExposureScore(tabId, this.settings.daysBefore, score => {
                setBadgeText(tabId, score);
            });
        } else {
            setBadgeText(tabId);
        }
    };

    let updateTabBadge = function(tabId) {
        if ( tabId === -1 ) { return; }
        const tabDetails = ubo.tabIdToDetailsMap.get(tabId);
        if (
            tabDetails !== undefined &&
            tabDetails.actualExposureScore === undefined &&
            tabDetails.updateBadgeTimer === undefined
        ) {
            tabDetails.updateBadgeTimer = setTimeout(
                updateTabBadgeAsync.bind(ubo, tabId),
                751
            );
        }
    };

    self.browser.tabs.onRemoved.addListener(function(tabId) {
        const tabDetails = ubo.tabIdToDetailsMap.get(tabId);
        if ( tabDetails === undefined ) { return; }
        if ( tabDetails.updateBadgeTimer ) {
            clearTimeout(tabDetails.updateBadgeTimer);
            tabDetails.updateBadgeTimer = undefined;
        }
        ubo.tabIdToDetailsMap.delete(tabId);
    });

    // The assumptions are:
    // - if onSendHeaders is called, then headers are really sent;
    // - if headers are sent, then a connection to a remote server is being
    //   made.
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
    // See <https://developer.chrome.com/extensions/webRequest>:
    // > The web request API guarantees that for each request either
    // > onCompleted or onErrorOccurred is fired as the final event with one
    // > exception: If a request is redirected to a data:// URL,
    // > onBeforeRedirect is the last reported event.
    //
    // When a URL is redirected to a data: URI:
    // - Chromium: onSendHeaders is never called.
    // - Firefox: onSendHeaders IS called.
    // So an extra test is needed to find out whether there was an actual
    // connection to a remote server. Currently testing status code, but this
    // will be an issue if ever Firefox aligns its behavior to that of
    // Chromium, as the latter contains a valid status code of 307. If this
    // ever happens, maybe using details.ip?
    self.browser.webRequest.onBeforeRedirect.addListener(
        function(details) {
            if ( !details.ip && details.redirectUrl.startsWith('data:') ) {
                requestIds.delete(details.requestId);
            }
            ubo.processRequest(details, requestIds.has(details.requestId) === false);
            updateTabBadge(details.tabId);
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
                        ubo.exportHeatmapData(tabs[0].id, callback);
                    } else {
                        callback();
                    }
                });
                return true;
            case 'getStorageUsed':
                if ( self.browser.storage.local.getBytesInUse ) {
                    // Exclude space taken by assets cache.
                    ubo.assets.getAssetCacheKeys(keys => {
                        self.browser.storage.local.getBytesInUse(Array.from(keys.values()), usedByCache => {
                            self.browser.storage.local.getBytesInUse(null, used => {
                                callback(used - usedByCache);
                            });
                        });
                    });
                    return true;
                }
                break;
            case 'setDaysBefore':
                if ( typeof details.value === 'number' ) {
                    ubo.settings.daysBefore = details.value;
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

    self.browser.alarms.onAlarm.addListener(function(details) {
        if ( details.name === 'savePrivexData' ) {
            ubo.mustSaveTimer = false;
            ubo.savePrivexData();
            return;
        }
        console.error('unknown alarm:', details.name);
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
