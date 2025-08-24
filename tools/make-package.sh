#!/usr/bin/env bash
#
# This script assumes a linux environment

if [ -z "$1" ]; then
    echo "*** Error: need destination directory"
    exit 1
fi

DES=build/"$1"

echo "*** uBO-Scope: creating extension in $DES"

rm -rf $DES
mkdir -p $DES

echo "*** uBO-Scope: copying files"

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
