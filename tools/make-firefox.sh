#!/usr/bin/env bash
#
# This script assumes a linux environment

echo "*** uBO-Scope.firefox: start"

./tools/make-package.sh "uBO-Scope.firefox"

if [ -n "$1" ]; then
    pushd $DES > /dev/null
    zip ../$(basename $DES).xpi -qr *
    popd > /dev/null
    echo "*** uBO-Scope.chromium: created XPI package"
fi

echo "*** uBO-Scope.firefox: done"
