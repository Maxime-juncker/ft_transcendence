
TSC = npx tsc

SRCS = test.ts
OBJS = $(SRCS:.ts=.js)
OBJS_D = ts/

VPATH = ts

.PHONY: all
all: $(OBJS)

%.js: %.ts 
	$(TSC) $<

.PHONY: clean
clean:
	rm -fr $(OBJS_D)$(OBJS)

