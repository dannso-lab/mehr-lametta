

deps:
	yarn install --frozen-lockfile
.PHONY: deps

run-local: src/dannso
	yarn dev
.PHONY: run-local

test:
	yarn test
.PHONY: test

src/dannso:
	ln -s $(abspath ../common/dannso-ts-lib/src) src/dannso