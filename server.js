import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import moment from "moment-timezone"; 

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT;
const MODEL_ID = process.env.MODEL_ID;

const replaceRelativeDates = (text) => {
  const now = moment().tz("Asia/Ho_Chi_Minh");

  let dates = {
    today: now.format("YYYY-MM-DD"),
    tomorrow: now.add(1, "days").format("YYYY-MM-DD"),
    "this week": now.startOf("isoWeek").format("YYYY-MM-DD"),
    "next week": now.add(1, "weeks").startOf("isoWeek").format("YYYY-MM-DD"),
  };

  text = text.replace(
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(tomorrow|next week)?\b/gi,
    (match, day, modifier) => {
      let targetDay = moment().day(day); 

      if (modifier === "tomorrow" || now.isAfter(targetDay, "day")) {
        targetDay.add(7, "days"); 
      } else if (modifier === "next week") {
        targetDay.add(7, "days");
      }

      return targetDay.format("YYYY-MM-DD");
    }
  );

  return text.replace(/\b(today|tomorrow|this week|next week)\b/gi, (match) => dates[match.toLowerCase()]);
};

app.post("/api/gemini", async (req, res) => {
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "Invalid API Key" });

  try {
    let { text } = req.body;
    text = replaceRelativeDates(text); 
    console.log("🔄 Processed text:", text);

    const prompt = `Extract task details from: "${text}". Respond with JSON:
    {
      "title": "<Task Name>",
      "startTime": "<yyyy-mm-dd HH:mm:ss>",
      "endTime": "<yyyy-mm-dd HH:mm:ss>"
    }`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] }
    );

    let rawText = response.data.candidates[0]?.content.parts[0]?.text || "{}";
    rawText = rawText.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    
    const extractedData = JSON.parse(rawText);
    if (!extractedData.title || !extractedData.startTime || !extractedData.endTime) throw new Error("Missing fields");

    console.log("✅ Extracted Data:", extractedData);
    res.status(200).json(extractedData);

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
