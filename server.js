import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Gemini proxy
app.post("/api/gemini", async (req, res) => {
  try {
    const { contents } = req.body;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Gemini server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 靜態檔案
app.use(express.static("dist"));

app.listen(8080, () => {
  console.log("Backend running on port 8080");
});
