import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT;
const MODEL_ID = "tunedModels/mindcoachapi-76a6w7vlj5ae";

app.post("/api/gemini", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Invalid API Key" });
  }

  console.log("✅ API received request:", req.body);

  try {
    let { text } = req.body;

    // Replace relative dates with actual dates

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

    console.log(response.content);

    try {
      let rawText = response.data.candidates[0]?.content.parts[0]?.text || "{}";

      rawText = rawText
        .replace(/```json\n?/, "")
        .replace(/\n?```/, "")
        .trim();

      const extractedData = JSON.parse(rawText);

      if (
        !extractedData.title ||
        !extractedData.startTime ||
        !extractedData.endTime
      ) {
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

app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
