#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.safari: start"

./tools/make-package.sh "uBO-Scope.safari"

if [ -n "$1" ]; then
    pushd $(dirname $DES) > /dev/null
    zip uBO-Scope.safari.zip -qr $(basename $DES)/*
    popd > /dev/null
    echo "*** uBO-Scope.safari: created ZIP package"
fi

echo "*** uBO-Scope.safari: done"
