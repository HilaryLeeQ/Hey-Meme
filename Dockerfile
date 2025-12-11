FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# ✅ 在 build 之前設定 ARG，讓 Vite 在打包時就能讀到
ARG VITE_GIPHY_API_KEY
ARG VITE_TENOR_API_KEY
ARG VITE_OPENAI_API_KEY
ARG VITE_GEMINI_API_KEY

# ✅ 設定為環境變數
ENV VITE_GIPHY_API_KEY=$VITE_GIPHY_API_KEY
ENV VITE_TENOR_API_KEY=$VITE_TENOR_API_KEY
ENV VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# ✅ 現在 build，Vite 會把這些值打包進去
RUN npm run build 

EXPOSE 8080

# ✅ 直接啟動 preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8080"]
