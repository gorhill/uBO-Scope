#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.chromium: Creating web store package"
echo "*** uBO-Scope.chromium: Copying files"

DES=build/uBO-Scope.chromium
rm -rf $DES
mkdir -p $DES

cp -R assets                       $DES/
cp -R css                          $DES/
cp -R img                          $DES/
cp -R js                           $DES/
cp *.html                          $DES/
cp platform/chromium/manifest.json $DES/
cp LICENSE.txt                     $DES/
cp README.md                       $DES/

mkdir -p $DES/js/lib
cp node_modules/punycode/punycode.es6.js $DES/js/lib/

if [ -n "$1" ]; then
    echo "*** uBO-Scope.chromium: Creating package..."
    pushd $(dirname $DES) > /dev/null
    zip uBO-Scope.chromium.zip -qr $(basename $DES)/*
    popd > /dev/null
fi

echo "*** uBO-Scope.chromium: Package done."
