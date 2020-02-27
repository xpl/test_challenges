FROM node:13-alpine
ENV TERM xterm-256color
ENV NODE_ENV production

WORKDIR /usr/src/app

# Install NPM deps first (separate layer for speedier rebuilds)
COPY package*.json ./
RUN npm ci --only=production

# App source
COPY src ./src
ENTRYPOINT ["node", "-r", "esm", "src/main"]