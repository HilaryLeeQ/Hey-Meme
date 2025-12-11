# 1. 使用 Node.js 環境 (就像是準備廚房)
FROM node:18-alpine

# 2. 設定工作目錄
WORKDIR /app

# 3. 複製你的依賴清單 (package.json)
COPY package*.json ./

# 4. 安裝依賴 (npm install - 把食材買回來)
RUN npm install

# 5. 複製所有程式碼到容器裡
COPY . .

# 6. 建置網頁 (npm run build - 開始煮菜)
RUN npm run build

# 7. 告訴它要聽 8080 port (雖然我們指令有寫，但這裡宣告一下比較保險)
EXPOSE 8080

# 8. 啟動服務 (執行我們剛剛修好的 start 指令)
CMD ["npm", "run", "start"]
