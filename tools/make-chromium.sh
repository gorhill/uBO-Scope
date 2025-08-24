#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.chromium: start"

./tools/make-package.sh "chromium" "$1"

if [ -n "$1" ]; then
    DES=build/uBO-Scope.chromium
    pushd $(dirname $DES) > /dev/null
    zip uBO-Scope.chromium.zip -qr $(basename $DES)/*
    popd > /dev/null
    echo "*** uBO-Scope.chromium: created ZIP package"
fi

echo "*** uBO-Scope.chromium: done"
