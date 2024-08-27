no-args: deps run-local

deps:
	make -C common deps
	make -C dashboard deps
	make -C backend deps
	make -C infra-local deps
.PHONY: deps

run-local:
	make -C infra-local run-local
.PHONY: run-local