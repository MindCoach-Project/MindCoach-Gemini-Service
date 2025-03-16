import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors"; 

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = "tunedModels/create-task-final-8s182o5t6vu7";

app.post("/api/gemini", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "API Key không hợp lệ" });
  }

  console.log("✅ API nhận request:", req.body);

  try {
    const { text } = req.body;

    const prompt = `Bạn là một AI trợ lý giúp trích xuất thông tin nhiệm vụ từ câu nói của người dùng. 
    Hãy phân tích câu sau và luôn trả về JSON với định dạng chính xác:
    {
      "title": "<Tên nhiệm vụ>",
      "startTime": "<yyyy-mm-dd HH:mm:ss>",
      "endTime": "<yyyy-mm-dd HH:mm:ss>"
    }
    Câu nói của người dùng: "${text}"
    Chỉ trả về JSON, không kèm theo bất kỳ văn bản nào khác.`;

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
        throw new Error("Dữ liệu không đủ trường cần thiết.");
      }

      res.status(200).json(extractedData);
    } catch (parseError) {
      res.status(500).json({ error: "Dữ liệu phản hồi không hợp lệ từ Gemini" });
    }
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gọi Gemini API" });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
