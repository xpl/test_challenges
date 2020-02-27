# End-to-end tests
test:
    cd test && docker-compose up --build --abort-on-container-exit --exit-code-from test

# Development mode (with hot code reload — both for service and tests)
dev:
    cd test && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --abort-on-container-exit

# make targets always out-of-date
.PHONY: test dev