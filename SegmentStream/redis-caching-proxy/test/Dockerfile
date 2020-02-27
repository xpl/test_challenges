FROM node:13-alpine
ENV TERM xterm-256color

WORKDIR /usr/src/app

# Deps, .env
COPY package*.json .env ./
RUN npm ci

# App source
COPY src ./src
ENTRYPOINT ["npm", "start"]