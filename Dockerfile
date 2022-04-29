FROM --platform=amd64 node:16-buster

WORKDIR /app

COPY package*.json ./
RUN npm install