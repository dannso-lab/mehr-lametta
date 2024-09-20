deps:
	yarn install --frozen-lockfile
.PHONY: deps

run-local: src/dannso
	yarn dev
.PHONY: run-local

src/dannso:
	ln -s $(abspath ../common/dannso-ts-lib/src) src/dannso

test:
	yarn test
.PHONY: test