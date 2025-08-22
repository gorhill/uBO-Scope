#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.firefox: Creating web store package"
echo "*** uBO-Scope.firefox: Copying files"

DES=build/uBO-Scope.firefox
rm -rf $DES
mkdir -p $DES

cp -R assets                      $DES/
cp -R css                         $DES/
cp -R img                         $DES/
cp -R js                          $DES/
cp *.html                         $DES/
cp platform/firefox/manifest.json $DES/
cp LICENSE.txt                    $DES/
cp README.md                      $DES/

if [ -n "$1" ]; then
    echo "*** uBO-Scope.firefox: Creating package..."
    pushd $DES > /dev/null
    zip ../$(basename $DES).xpi -qr *
    popd > /dev/null
fi

echo "*** uBO-Scope.firefox: Package done."
