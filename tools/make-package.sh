#!/usr/bin/env bash
#
# This script assumes a linux environment

if [ -z "$1" ]; then
    echo "*** Error: need platform name"
    exit 1
fi

PLATFORM="$1"
DES=build/uBO-Scope."$PLATFORM"

echo "*** uBO-Scope: creating extension in $DES"

rm -rf "$DES"
mkdir -p "$DES"

echo "*** uBO-Scope: copying files"

cp -R src/*                        "$DES"/
cp LICENSE.txt                     "$DES"/
cp platform/"$PLATFORM"/manifest.json "$DES"/

mkdir -p "$DES"/js/lib
cp node_modules/punycode/punycode.es6.js "$DES"/js/lib/

# Version provided as argument
if [ -n "$2" ]; then
    echo "*** uBO-Scope: setting version to $2 in manifest.json"
    tmp=$(mktemp)
    jq --arg a "$2" '.version = $a' "$DES/manifest.json" > "$tmp" && \
        mv "$tmp" "$DES/manifest.json"
fi
