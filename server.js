import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// ===== Gemini Chat API =====
app.post("/api/chat", async (req, res) => {
  try {
    const { systemInstruction, message, imageBase64 } = req.body;

    const contents = [];

    if (systemInstruction) {
      contents.push({
        role: "user",
        parts: [{ text: systemInstruction }]
      });
    }

    if (message) {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    if (imageBase64) {
      contents.push({
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg"
            }
          }
        ]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Gemini server error:", err);
    res.status(500).json({ error: "Gemini server failed" });
  }
});

// ===== Serve Frontend =====
app.use(express.static("dist"));

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
