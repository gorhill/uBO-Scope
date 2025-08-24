#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.firefox: start"

./tools/make-package.sh "firefox" "$1"

if [ -n "$1" ]; then
    DES=build/uBO-Scope.firefox
    pushd $DES > /dev/null
    zip ../$(basename $DES).xpi -qr *
    popd > /dev/null
    echo "*** uBO-Scope.firefox: created XPI package"
fi

echo "*** uBO-Scope.firefox: done"
