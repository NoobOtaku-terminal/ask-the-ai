require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(question);
    const response = await result.response;
    
    // Artificial delay to meet 2-second requirement
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({ 
      response: response.text() 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI service error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});