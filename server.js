require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const visionAIRoute = require('./routes/CloudWrapper');
const authRoutes = require('./routes/AuthUser');

const app = express();
const PORT = 3007;

// Middleware to handle CORS and JSON body parsing
app.use(express.static('public'));
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Successfully connected to MongoDB'))
.catch(err => console.log('MongoDB connection error:', err));


// Mounting the routes
app.use('/vision', visionAIRoute);
app.use('/api/auth', authRoutes);

// Starting the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
