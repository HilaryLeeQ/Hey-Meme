window.ENV_CONFIG = {
  GIPHY_API_KEY: '__GIPHY_API_KEY__',
  TENOR_API_KEY: '__TENOR_API_KEY__',
  OPENAI_API_KEY: '__OPENAI_API_KEY__',
  GEMINI_API_KEY: '__GEMINI_API_KEY__'
};
```

**完成後你的檔案結構應該長這樣：**
```
你的專案/
├── components/
├── services/
├── public/              ← 新建的
│   └── config.js        ← 新建的
├── App.tsx
├── Dockerfile
├── index.html
├── package.json
└── vite.config.ts
