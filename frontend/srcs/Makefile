TSC = npx tsc -p tsconfig.json

SRCS =	login.ts User.ts \

OBJS = $(SRCS:.ts=.js)
OBJS_D = dist/

.PHONY: all
all: 
	$(TSC)

.PHONY: clean
clean:
	rm -fr $(OBJS_D)

.PHONY: re
re: clean all

