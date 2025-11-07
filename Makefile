.PHONY: publish-chromium publish-edge publish-firefox \
	publish-safari-macos publish-safari-ios

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
