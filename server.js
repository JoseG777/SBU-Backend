const express = require('express');
const path = require('path');
const cors = require('cors');
// const googleAIRoutes = require('./routes/GeminiAPI');
const visionAIRoute = require('./routes/CloudWrapper');
// const openAIWrapper = require('./routes/OpenAIWrapper');

const app = express();
const PORT = 3007;

// Middleware to handle CORS and JSON body parsing
app.use(express.static('public'));
// console.log(path.join(__dirname, '/static'));
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Mounting the routes
// app.use('/google/generateContent', googleAIRoutes);
app.use('/vision', visionAIRoute);
// app.use('/OpenAI', openAIWrapper);

// Starting the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
