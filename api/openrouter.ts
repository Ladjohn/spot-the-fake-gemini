export default async function handler(req, res) {
  try {
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (!OR_KEY) {
      console.warn('[openrouter] Missing OPENROUTER_API_KEY, using fallback questions');
      return returnFallbackQuestions(res);
    }

    const { messages } = req.body;

    const PRIMARY = "meta-llama/llama-3-8b-instruct";
    const FALLBACK = "mistralai/mistral-7b-instruct:free";

    const fetchWithTimeout = (model) =>
      Promise.race([
        fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ model, messages })
        }).then(res => res.json()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 8000)
        )
      ]);

    let data = await fetchWithTimeout(PRIMARY);

    if (data?.choices?.[0]?.message?.content) {
      console.log('[openrouter] Successfully generated content with PRIMARY model');
      return res.status(200).json(data);
    }

    console.log('[openrouter] PRIMARY model failed, trying FALLBACK');
    data = await fetchWithTimeout(FALLBACK);

    if (data?.choices?.[0]?.message?.content) {
      console.log('[openrouter] Successfully generated content with FALLBACK model');
      return res.status(200).json(data);
    }

    console.warn('[openrouter] Both models failed, using static fallback');
    return returnFallbackQuestions(res);

  } catch (err) {
    console.error('[openrouter] Error:', err instanceof Error ? err.message : err);
    return returnFallbackQuestions(res);
  }
}

function returnFallbackQuestions(res) {
  const fallbackQuestions = [
    { headline: "Octopus has 3 hearts", type: "REAL", explanation: "Octopuses have three hearts." },
    { headline: "Bananas are berries", type: "REAL", explanation: "Botanically, bananas are berries." },
    { headline: "Penguins live in the Arctic", type: "FAKE", explanation: "Penguins live in Antarctica, not the Arctic." },
    { headline: "Honey never spoils", type: "REAL", explanation: "Honey can last indefinitely." },
    { headline: "Humans use only 10% of their brains", type: "FAKE", explanation: "We use virtually all of our brain." },
    { headline: "Strawberries are berries", type: "FAKE", explanation: "Strawberries are not technically berries; they're aggregate fruits." },
    { headline: "Sharks have been around longer than dinosaurs", type: "REAL", explanation: "Sharks appeared over 450 million years ago, before dinosaurs." },
    { headline: "A group of flamingos is called a flamboyance", type: "REAL", explanation: "Yes, a group of flamingos is officially called a flamboyance." },
    { headline: "Gold is heavier than lead", type: "REAL", explanation: "Gold has a density of 19.3 g/cm³, while lead is 11.3 g/cm³." },
    { headline: "Dolphins are fish", type: "FAKE", explanation: "Dolphins are mammals, not fish." }
  ];

  // Shuffle and return 5 random questions
  const shuffled = fallbackQuestions.sort(() => Math.random() - 0.5).slice(0, 5);
  
  return res.status(200).json({
    choices: [{
      message: {
        content: JSON.stringify(shuffled)
      }
    }]
  });
}
