.PHONY: all
all:
	$(MAKE) build;
	$(MAKE) start;

.PHONY: build
build:
	cp shared/* backend/src/ts/modules/game
	cp shared/* frontend/src/ts/pages
	docker compose build

.PHONY: start
start:
	docker compose up

.PHONY: vclean
vclean:
	docker compose down -v
.PHONY: clean
clean:
	docker compose down -v
	docker system prune -a -f

.PHONY: fclean
fclean: clean
	docker volume prune -a -f

.PHONY: benchmark
benchmark:
	docker compose --profile benchmark up

.PHONY: re
re:
	$(MAKE) fclean;
	$(MAKE) all;
