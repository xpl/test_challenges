FROM node:13-alpine
ENV TERM xterm-256color

WORKDIR /usr/src/app

# Install NPM deps first (separate layer for speedier rebuilds)
COPY package*.json ./
RUN npm ci

# App source
COPY .env *.js ./
ENTRYPOINT ["npm", "start"]