FROM ghcr.io/puppeteer/puppeteer:22.10.0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    PORT=3000\
    URI=mongodb+srv://nezz:somo@cluster0.kvpnubw.mongodb.net/Games?retryWrites=true&w=majority\
    NODE_ENV=test

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD [ "node", "index.js" ]
