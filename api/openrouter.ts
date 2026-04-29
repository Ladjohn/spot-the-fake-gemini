export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      return res.status(500).json({ error: "Missing OPENROUTER_API_KEY" });
    }

    const { messages, temperature = 0.7, max_tokens = 1200 } = req.body;

    const PRIMARY = "mistralai/mistral-7b-instruct:free";
    const FALLBACK = "mistralai/mistral-7b-instruct:free";

    const fetchWithTimeout = (model) =>
      Promise.race([
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model, messages, temperature, max_tokens })
        }).then(res => res.json()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        )
      ]);

    let data = await fetchWithTimeout(PRIMARY);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    data = await fetchWithTimeout(FALLBACK);

    if (data?.choices?.[0]?.message?.content) {
      return res.status(200).json(data);
    }

    // 🔥 always return something (no blank UI)
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            {
              headline: "The Eiffel Tower is located in Paris",
              type: "REAL",
              category: "Culture",
              difficulty: "Easy",
              explanation: "Correct answer: REAL. Fact check: The Eiffel Tower is a landmark in Paris, France.",
              imagePrompt: "Eiffel Tower Paris landmark"
            },
            {
              headline: "The Pacific Ocean is smaller than the Mediterranean Sea",
              type: "FAKE",
              category: "Science",
              difficulty: "Easy",
              explanation: "Correct answer: FAKE. Fact check: The Pacific Ocean is the largest ocean on Earth.",
              imagePrompt: "Pacific Ocean map"
            }
          ])
        }
      }]
    });

  } catch (err) {
    return res.status(200).json({
      choices: [{
        message: {
          content: JSON.stringify([
            {
              headline: "Mercury is the closest planet to the Sun",
              type: "REAL",
              category: "Science",
              difficulty: "Easy",
              explanation: "Correct answer: REAL. Fact check: Mercury orbits closest to the Sun among the planets.",
              imagePrompt: "planet Mercury space"
            }
          ])
        }
      }]
    });
  }
}
