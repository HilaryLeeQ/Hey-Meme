FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# 讓 Node.js 環境下的 process.env 也被設定，以防程式碼仍在使用舊的寫法
ENV GIPHY_API_KEY=$VITE_GIPHY_API_KEY
ENV TENOR_API_KEY=$VITE_TENOR_API_KEY
ENV OPENAI_API_KEY=$VITE_OPENAI_API_KEY
# 這是為了配合你的程式碼裡面有檢查的名稱

EXPOSE 8080

# 步驟 1: 在容器建置階段就完成打包 (Build)
# 這樣在 CMD 階段就不會浪費時間了
RUN npm run build 

CMD ["/bin/sh", "-c", "npm run build && npm run start"]
