FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# 這是為了讓外面連得進來
EXPOSE 8080

# === 關鍵修改在這裡 ===
# 我們把 build (打包) 移到最後啟動的時候才做
# 這樣它才能讀到 Cloud Run 設定的環境變數
CMD ["/bin/sh", "-c", "npm run build && npm run start"]
