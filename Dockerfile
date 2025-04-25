FROM node:23-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY config/env/production.env production.env
COPY config/env/development.env development.env

RUN npm run build

EXPOSE 3000

CMD ["npm", "run" ,"start:prod"]