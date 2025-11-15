const express = require("express");
const OpenAI = require("openai");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const { text, targetLang } = req.body;

  try {
    const messages = [
      {
        role: "system",
        content: `You are a translator specialized in Philippine legal context. 
Translate legal and government-related texts accurately, preserving legal terms, structure, and meaning. 
Use terminology familiar to Philippine law, including statutes, administrative rules, and common legal phrases. 
Always return ONLY the translation with no extra words, explanations, or commentary.`,
      },
      {
        role: "user",
        content:
          targetLang === "fil"
            ? `Translate the following English legal text to Filipino:\n\n${text}`
            : `Translate the following Filipino legal text to English:\n\n${text}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    res.json({
      translation: completion.choices[0].message.content.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: "Translation failed" });
  }
});

module.exports = router;
