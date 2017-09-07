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

if ( self.browser instanceof Object === false ) {
    if ( self.chrome instanceof Object === false ) {
        throw new Error('!?!');
    }
    self.browser = self.chrome;
}

/******************************************************************************/

var uBOScope = { // jshint ignore:line
    version: '0.1.0',
    noopFunc: function() {},
    lefthandOffset: Math.pow(2, 26),
    righthandMask: 0x3FFFFFF,
    privexData: {
        domainIdGenerator: 1,
        domainToIdMap: new Map(),
        idToDomainMap: new Map(),
        monthlyMetadata: {
            monthIdMin: Number.MAX_SAFE_INTEGER,
            monthIdMax: Number.MIN_SAFE_INTEGER,
        },
        monthly: new Map(),
        daily: new Map(),
    },
    authorityData: {
        stringToStringId: new Map(),
        stringIdToString: new Map(),
        domainIdToCategoryId: new Map(),
        domainIdToAuthorityId: new Map(),
    },
    mustSaveBits: 0,
    mustSaveTimer: false,
    DIRTY_DOMAIN_TO_ID_MAP: 1,
    DIRTY_DAILY_MAP: 2,
    DIRTY_MONTHLY_MAP: 4,
    pslAssetKey: 'public_suffix_list.dat',
    dtpAssetKey: 'disconnect-tracking-protection',
    reAuthorityFromURI: /^(?:[^:\/?#]+:)?(\/\/[^\/?#]+)/,
    reCommonHostnameFromURL: /^https?:\/\/([0-9a-z_][0-9a-z._-]*[0-9a-z])\//,
    reHostFromAuthority: /^(?:[^@]*@)?([^:]+)(?::\d*)?$/,
    reHostFromNakedAuthority: /^[0-9a-z._-]+[0-9a-z]$/i,
    reIPAddressNaive: /^\d+\.\d+\.\d+\.\d+$|^\[[\da-zA-Z:]+\]$/,
    reIPv6FromAuthority: /^(?:[^@]*@)?(\[[0-9a-f:]+\])(?::\d*)?$/i,
    reMustNormalizeHostname: /[^0-9a-z._-]/,
    settings: {
        daysBefore: 30,
        heatmapHue: 0,
    },
    tabIdToDetailsMap: new Map(),
};

/******************************************************************************/
