const express = require('express');
const app = express();
const PORT = 3007;

// Gemini
const googleAIRoutes = require('./routes/GeminiAPI');
app.use('/google/generateContent', googleAIRoutes);

// CloudWrapper
const visionAIRoute = require('./routes/CloudWrapper');
app.use('/vision', visionAIRoute);

// OpenAIWrapper
const openAIWrapper = require('./routes/OpenAIWrapper');
app.use('/OpenAI', openAIWrapper);


// Run the port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});