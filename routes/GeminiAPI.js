// const express = require('express');
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// require('dotenv').config();
// const router = express();
// router.use(express.json());

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// router.post('/', async (req, res) => {
//     const { query, model = "gemini-pro" } = req.body; 
//     try {
//         const genModel = genAI.getGenerativeModel({ model });
//         const results = await genModel.generateContent(query);
//         res.json(results);
//     } catch (error) {
//         console.error("ERROR: ", error);
//         res.status(500).send("ERROR, try again");
//     }
// });

// module.exports = router;
