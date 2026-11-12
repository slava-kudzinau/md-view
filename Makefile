# md-view: the tests, install and uninstall.
#   make check                        runs the four tests in order; stops at the first failure
#   make install PREFIX=/usr/local    copies md-view under PREFIX (default /usr/local)
#   make uninstall PREFIX=/usr/local  removes the files that install wrote
# PREFIX must not hold a single quote: the installed launcher quotes it with single quotes.

PREFIX ?= /usr/local
BINDIR = $(PREFIX)/bin
SHAREDIR = $(PREFIX)/share/md-view

# The vendored files of lib/. install copies them to SHAREDIR with mode 644.
VENDORED = marked.min.js highlight.min.js github-markdown-light.css \
	github-markdown-dark.css hljs-github.min.css hljs-github-dark.min.css \
	marked.LICENSE.md highlight.LICENSE.md github-markdown.LICENSE.md

# Expands to a make error when PREFIX holds a single quote. Put it first in a recipe.
PREFIX_CHECK = $(if $(findstring ',$(PREFIX)),$(error md-view: PREFIX must not hold a single quote))

.PHONY: check install uninstall

check:
	sh tests/browser-page.sh
	sh tests/browser-links-dom.sh
	sh tests/hostile-dom.sh
	sh tests/launcher.sh

# install writes the launcher to a temp file, then install replaces BINDIR/md-view.
# A symlink at BINDIR/md-view is replaced, and its target is not written.
install:
	@$(PREFIX_CHECK)
	install -d '$(SHAREDIR)' '$(BINDIR)'
	install -m 755 lib/md-view '$(SHAREDIR)/md-view'
	install -m 644 $(VENDORED:%=lib/%) '$(SHAREDIR)/'
	t=$$(mktemp "$${TMPDIR:-/tmp}/md-view.XXXXXX") || exit 1; \
	printf '#!/bin/sh\n' > "$$t" && \
	printf "exec '%s' \"\$$@\"\n" '$(SHAREDIR)/md-view' >> "$$t" && \
	install -m 755 "$$t" '$(BINDIR)/md-view'; \
	s=$$?; rm -f "$$t"; exit $$s

# addprefix and addsuffix, not a pattern substitution: a % in PREFIX would be
# replaced by a file name.
uninstall:
	@$(PREFIX_CHECK)
	rm -f '$(BINDIR)/md-view' '$(SHAREDIR)/md-view' $(addsuffix ',$(addprefix '$(SHAREDIR)/,$(VENDORED)))
	rmdir '$(SHAREDIR)' 2>/dev/null || true
