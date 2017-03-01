#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.webext: Creating web store package"
echo "*** uBO-Scope.webext: Copying files"

DES=dist/build/uBO-Scope.webext
rm -rf $DES
mkdir -p $DES

cp -R assets                 $DES/
cp -R css                    $DES/
cp -R img                    $DES/
cp -R js                     $DES/
cp manifest.json             $DES/
cp *.html                    $DES/
cp LICENSE.txt               $DES/
cp README.md                 $DES/

if [ "$1" = all ]; then
    echo "*** uBO-Scope.webext: Creating package..."
    pushd $(dirname $DES/) > /dev/null
    zip uBO-Scope.webext.zip -qr $(basename $DES/)/*
    popd > /dev/null
fi

echo "*** uBO-Scope.webext: Package done."
