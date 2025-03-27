const axios = require('axios');

const analyzeCode = async (code) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        prompt: `Analyze this code and suggest improvements:\n${code}`,
        model: 'text-davinci-003',
        max_tokens: 200,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );
    return response.data.choices[0].text;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return 'Unable to analyze code at this time.';
  }
};

module.exports = { analyzeCode };
