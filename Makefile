.PHONY: publish-chromium publish-edge

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
