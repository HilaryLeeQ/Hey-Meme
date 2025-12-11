FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

# 讓 build 在啟動時才執行，這樣才讀得到 Cloud Run 的鑰匙
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
