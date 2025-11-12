.PHONY: all
all:
	$(MAKE) build;
	$(MAKE) start;

.PHONY: build
build:
	cp shared/* backend/src/ts/
	cp shared/* frontend/src/ts/
	docker compose build

.PHONY: start
start:
	docker compose up

.PHONY: clean
clean:
	docker compose down
	docker system prune -a -f

.PHONY: fclean
fclean: clean
	docker volume prune -a -f

.PHONY: re
re:
	$(MAKE) fclean;
	$(MAKE) all;
