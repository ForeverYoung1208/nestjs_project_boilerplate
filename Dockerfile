# Base image
FROM node:20.11-alpine3.18

RUN apk add --no-cache bash python3 make g++ mc

RUN npm i -g @nestjs/cli

RUN npm i -g yarn --force

RUN mkdir /app

WORKDIR /app

