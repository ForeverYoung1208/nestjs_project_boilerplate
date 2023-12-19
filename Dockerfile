# Base image
FROM node:20.10

# Create app directory
WORKDIR /usr/src/app

EXPOSE 3001:3001

# Bundle app source
COPY ./src ./
COPY ./src ./
COPY package*.json ./
COPY yarn.lock ./
COPY ./tsconfig* ./

# Install app dependencies
#RUN npm install
RUN npm install --global yarn --force
RUN yarn install --frozen-lockfile


# Creates a "dist" folder with the production build
RUN yarn build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]