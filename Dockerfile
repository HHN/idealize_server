FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY config/env/development.env development.env
COPY config/env/production.env production.env
COPY config/env/staging.env staging.env

RUN npm run build

EXPOSE 6000

CMD ["npm", "run" ,"start:prod"]