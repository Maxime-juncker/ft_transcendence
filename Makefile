.PHONY: all
all:
	$(MAKE) start;

.PHONY: build
build:
	docker compose build
	(cd cli-app && ./build.sh)

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
