.PHONY: \
	chromium firefox safari \
	publish-chromium publish-edge publish-firefox \
	publish-safari-macos publish-safari-ios

sources := Makefile \
	tools/make-package.sh \
	$(shell find ./src -type f) \

build/uBO-Scope.chromium: $(sources) platform/chromium/*
	tools/make-chromium.sh

chromium: build/uBO-Scope.chromium

build/uBO-Scope.firefox: $(sources) platform/firefox/*
	tools/make-firefox.sh

firefox: build/uBO-Scope.firefox

build/uBO-Scope.safari: $(sources) platform/safari/*
	tools/make-safari.sh

safari: build/uBO-Scope.safari

# Usage: make publish-chromium version=?
publish-chromium:
	node publish-extension/publish-chromium.js \
		ghowner=gorhill \
		ghrepo=uBO-Scope \
		ghtag=$(version) \
		ghasset=chromium \
		storeid=bbdpgcaljkaaigfcomhidmneffjjjfgp

publish-edge:
	node publish-extension/publish-edge.js \
		ghowner=gorhill \
		ghrepo=uBO-Scope \
		ghtag=$(version) \
		ghasset=chromium \
		storeid=maybe \
		productid=$(maybe)

# Usage: make publish-firefox version=?
publish-firefox:
	node publish-extension/publish-firefox.js \
		ghowner=gorhill \
		ghrepo=uBO-Scope \
		ghtag=$(version) \
		ghasset=firefox \
		storeid=uBO-Scope@raymondhill.net \
		channel=listed

# Usage: make publish-safari-macos version=?
publish-safari-macos:
	node dist/safari/publish-extension.js \
		ghtag=$(version) macos

# Usage: make publish-safari-ios version=?
publish-safari-ios:
	node dist/safari/publish-extension.js \
		ghtag=$(version) ios
