# Base image
FROM node:20.10

# Create app directory
WORKDIR /usr/src/app

EXPOSE 3001:3001

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY yarn.lock ./

# Install app dependencies
#RUN npm install
RUN npm install --global yarn
RUN yarn install --frozen-lockfile

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN yarn build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]