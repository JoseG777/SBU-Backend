const express = require('express');
const app = express();
const PORT = 3007;

const googleAIRoutes = require('./routes/GeminiAPI');
app.use('/google/generateContent', googleAIRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
