FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

# 步驟 1: 在容器建置階段就完成打包 (Build)
# 這樣在 CMD 階段就不會浪費時間了
RUN npm run build 

# 步驟 2: 啟動指令 (只負責啟動，不負責打包)
CMD ["npm", "run", "start"]
