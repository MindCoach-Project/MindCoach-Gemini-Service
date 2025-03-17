import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors"; 
import dayjs from "dayjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = "tunedModels/create-task-final-8s182o5t6vu7";

const replaceRelativeDates = (text) => {
  const today = dayjs();
  const tomorrow = today.add(1, "day");
  const thisWeekStart = today.startOf("week");
  const thisWeekEnd = today.endOf("week");

  return text
    .replace(/\btoday\b/gi, today.format("YYYY-MM-DD"))
    .replace(/\btomorrow\b/gi, tomorrow.format("YYYY-MM-DD"))
    .replace(/\bthis week\b/gi, `${thisWeekStart.format("YYYY-MM-DD")} to ${thisWeekEnd.format("YYYY-MM-DD")}`);
};

app.post("/api/gemini", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Invalid API Key" });
  }

  console.log("✅ API received request:", req.body);

  try {
    let { text } = req.body;

    // Replace relative dates with actual dates
    text = replaceRelativeDates(text);

    const prompt = `You are an AI assistant that extracts task details from user input. 
    Analyze the following sentence and always return a JSON object with the exact format:
    {
      "title": "<Task Name>",
      "startTime": "<yyyy-mm-dd HH:mm:ss>",
      "endTime": "<yyyy-mm-dd HH:mm:ss>"
    }
    User's input: "${text}"
    Respond with JSON only, without any additional text.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );

    try {
      let rawText = response.data.candidates[0]?.content.parts[0]?.text || "{}";

      rawText = rawText.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

      const extractedData = JSON.parse(rawText);

      if (!extractedData.title || !extractedData.startTime || !extractedData.endTime) {
        throw new Error("Missing required fields.");
      }

      res.status(200).json(extractedData);
    } catch (parseError) {
      res.status(500).json({ error: "Invalid response data from Gemini" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error calling Gemini API" });
  }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running at http://172.16.29.12:${PORT}`));
