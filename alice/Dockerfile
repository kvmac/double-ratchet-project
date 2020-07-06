FROM node:13.12.0-alpine

LABEL maintainer="Kodee McIntosh <kodee.mcintosh@gmail.com>"

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY package-lock.json ./
RUN yarn install --silent
RUN yarn install react-scripts@3.4.1 -g --silent

# add app
COPY . ./

EXPOSE 3000

# start app
CMD ["yarn", "start"]