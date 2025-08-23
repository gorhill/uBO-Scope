#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.safari: Creating web store package"
echo "*** uBO-Scope.safari: Copying files"

DES=build/uBO-Scope.safari
rm -rf $DES
mkdir -p $DES

cp -R assets                       $DES/
cp -R css                          $DES/
cp -R img                          $DES/
cp -R js                           $DES/
cp *.html                          $DES/
cp platform/safari/manifest.json   $DES/
cp LICENSE.txt                     $DES/
cp README.md                       $DES/

mkdir -p $DES/js/lib
cp node_modules/punycode/punycode.es6.js $DES/js/lib/

if [ -n "$1" ]; then
    echo "*** uBO-Scope.safari: Creating package..."
    pushd $(dirname $DES) > /dev/null
    zip uBO-Scope.safari.zip -qr $(basename $DES)/*
    popd > /dev/null
fi

echo "*** uBO-Scope.safari: Package done."
