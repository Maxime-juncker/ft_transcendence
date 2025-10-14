
TSC = npx tsc

SRCS = test.ts	\
	   game.ts	\

OBJS = $(SRCS:.ts=.js)
OBJS_D = js/

VPATH = ts

.PHONY: all
all: $(OBJS)

%.js: %.ts 
	$(TSC) $< --target ES2015 --outDir ./js/

.PHONY: clean
clean:
	rm -fr $(OBJS_D)$(OBJS)

.PHONY: re
re: clean all

