TSC = npx tsc

SRCS =	test.ts		\
		game.ts		\
		router.ts	\

OBJS = $(SRCS:.ts=.js)
OBJS_D = js

VPATH = ts

.PHONY: all
all: 
	mkdir -p $(OBJS_D)
	$(TSC)

.PHONY: clean
clean:
	rm -fr $(OBJS_D)

.PHONY: re
re: clean all

.PHONY: watch
watch:
	$(TSC) --watch &
	npx tailwindcss -i css/input.css -o css/output.css --watch
