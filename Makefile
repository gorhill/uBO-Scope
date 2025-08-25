.PHONY: publish-chromium publish-edge

publish-chromium:
	node publish-extension/publish-chromium.js \
		ghowner=gorhill \
		ghrepo=uBO-Scope \
		cwsid=bbdpgcaljkaaigfcomhidmneffjjjfgp \
		ghtag=$(version)

publish-edge:
	node publish-extension/publish-edge.js \
		ghowner=gorhill \
		ghrepo=uBO-Scope \
		edgeid=$(maybe) \
		ghtag=$(version)
