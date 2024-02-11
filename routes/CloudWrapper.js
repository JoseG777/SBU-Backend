// Imports

const tts = require('@google-cloud/text-to-speech');
const { readFileSync } = require('fs');
const util = require('util');
const fs = require('fs');
const OpenAI = require('openai');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const vision = require('@google-cloud/vision');
const bodyParser = require('body-parser');
const sizeOf = require('image-size');
const router = express();
require('dotenv').config();
CREDENTIALS_OAI = process.env.OPENAI_KEY;
const openai = new OpenAI({apiKey:CREDENTIALS_OAI});

const jwt = require('jsonwebtoken');
const User = require('../models/User');


// OPEN AI IMPLEMENTATION STARTS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
async function translate(prompt, language = "english") {
    if(language="english"){
        return prompt;
    }
    const response = await openai.chat.completions.create({
        messages: [,
            { "role": "user", "content": "Translate the following from English to " + language + ":" + "\n" + prompt }
        ],
        model: "gpt-3.5-turbo",
    });

    // const response = await openai.chat.completions.create({
    //     model: 'gpt-3.5-turbo',
    //     prompt: prompt_engineering + "\n" + bottle_text
    // });
    return response['choices'][0].message.content;
};
/**
 * 
 * @param {string} bottle_text text on the medical bottle
 * @param {string} prompt_engineering give it a prompt based on what question we wanna ask about it
 * @returns response from gpt3.5turbo
 */
const default_prompt = "The following is the label of a medicinal bottle or product. Briefly answer the following questions:\n 1. What is this medication and what is it used for?\n 2. What should someone taking this medication be aware of?\n 3. How often should this person take this medication?"
async function basic_query(bottle_text, language = "english", prompt_engineering = default_prompt) {
    let setting = "You are a medical assistant who speaks" + language + ":\n"
    const response = await openai.chat.completions.create({
        messages: [,
            { "role": "user", "content": setting + prompt_engineering + "\n" + bottle_text }
        ],
        model: "gpt-3.5-turbo",
    });

    // const response = await openai.chat.completions.create({
    //     model: 'gpt-3.5-turbo',
    //     prompt: prompt_engineering + "\n" + bottle_text
    // });
    return response['choices'][0].message.content;
};

/**
 * 
 * @param {string} bottle_text text on medical bottle
 * @returns response from gpt3.5turbo, where prompt_engineering is autogenerated with default message
 */
// async function bottle_query(bottle_text) {
//     const prompt_engineering = "The following is the label of a medicinal bottle or product. Answer the following questions in 25 words each:\n 1. What is this medication and what is it used for?\n 2. What should someone taking this medication be aware of?\n 3. How often should this person take this medication?"
//     return basic_query(bottle_text,prompt_engineering);
// };
// OPEN AI IMPLEMENTATION ENDS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 



// VISION AI IMPLEMENTATION STARTS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

router.use(bodyParser.json({ limit: '100mb' }));
router.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const CREDENTIALS = JSON.parse(readFileSync('GOOGLE_CLOUD_KEY.json'));

// Cloud Keys & Client
const CONFIG = {
    credentials: {
        private_key: CREDENTIALS.private_key,
        client_email: CREDENTIALS.client_email
    }
};

const client_text = new vision.ImageAnnotatorClient(CONFIG);


/**
 * 
 * @param {boundingPoly} object_box of the main object
 * @param {boundingPoly} text_box
 * @param {int} scale_w image width (x)
 * @param {int} scale_h image height (y)
 * @returns boolean, true if text box is contained within object box; false otherwise
 */


const constrained = (object_box, text_box, scale_w = 1, scale_h = 1) => {
    const o_x1 = object_box[0].x * scale_w;
    const o_y1 = object_box[0].y * scale_h;

    const o_x2 = object_box[2].x * scale_w;
    const o_y2 = object_box[2].y * scale_h;

    const t_x1 = text_box[0].x;
    const t_y1 = text_box[0].y;

    const t_x2 = text_box[2].x;
    const t_y2 = text_box[2].y;

    return ((t_x1 >= o_x1) &&
        (t_x2 <= o_x2) &&
        (t_y1 >= o_y1) &&
        (t_y2 <= o_y2));

};

/**
 * 
 * @param {string} file_path to the image
 * @returns text written on Packaged Goods container
 */
const bottle_text = async (file_path) => {

    // Detect text from given image and grab annotations
    let [text_result] = await client_text.textDetection(file_path);
    text_result = text_result.textAnnotations

    const request = {
        image: { content: readFileSync(file_path) },
    };

    const [locali_result] = await client_text.objectLocalization(request);
    const objects = locali_result.localizedObjectAnnotations;

    let packaged = null;
    let valid_targets = "Packaged goods";

    for (let i = 0; i < objects.length; i++) {
        let name = objects[i].name;
        // console.log(name);
        if (valid_targets === name) {
            if (packaged) {
                packaged = -1;
            }
            else {
                packaged = i;
            }
        }
    }
    if (packaged == -1) {
        return "Too many containers detected."
    }
    else if (packaged == null) {
        console.log(packaged);
        return "No containers detected."
    }

    let object_box = objects[packaged].boundingPoly.normalizedVertices;



    const dimensions = sizeOf(file_path);
    const x = dimensions.width;
    const y = dimensions.height;
    let compiled_text = "";
    text_result.forEach(annotation => {
        text_box = annotation.boundingPoly.vertices;
        if (constrained(object_box, text_box, x, y)) {
            compiled_text += annotation.description + " ";
        }
    });
    // console.log(compiled_text);
    return compiled_text;
}
// VISION AI IMPLEMENTATION ENDS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

// TTS AI IMPLEMENTATION STARTS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
const client_tts = new tts.TextToSpeechClient(CONFIG);

const voice_options = {
    "english": {
        "m": {
            "languageCode": [
                "en-US"
            ],
            "name": "en-US-Journey-D",
            "ssmlGender": "MALE",
            "naturalSampleRateHertz": 24000
        },
        "f": {
            "languageCode": [
                "en-US"
            ],
            "name": "en-US-Journey-F",
            "ssmlGender": "FEMALE",
            "naturalSampleRateHertz": 24000
        }
    },
    "spanish": {
        "m": {
            "languageCode": [
                "es-US"
            ],
            "name": "es-US-Neural2-C",
            "ssmlGender": "MALE",
            "naturalSampleRateHertz": 24000
        },
        "f": {
            "languageCode": [
                "es-US"
            ],
            "name": "es-US-Neural2-A",
            "ssmlGender": "FEMALE",
            "naturalSampleRateHertz": 24000
        }
    },
    "russian": {
        "f": {
            "languageCode": [
                "ru-RU"
            ],
            "name": "ru-RU-Standard-A",
            "ssmlGender": "FEMALE",
            "naturalSampleRateHertz": 24000
        }
    },
    "vietnamese": {
        "f": {
            "languageCode": [
                "vi-VN"
            ],
            "name": "vi-VN-Neural2-A",
            "ssmlGender": "FEMALE",
            "naturalSampleRateHertz": 24000
        }
    },
    "bengali": {
        "f": {
            "languageCode": [
                "bn-IN"
            ],
            "name": "bn-IN-Standard-A",
            "ssmlGender": "FEMALE",
            "naturalSampleRateHertz": 24000
        }

    }
}

async function read_text(text, voice = { languageCode: 'en-US', ssmlGender: 'NEUTRAL' }, file_location = 'output.mp3') {

    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: voice,
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await client_tts.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(file_location, response.audioContent, 'binary');
    console.log('Audio content written to file: output.mp3');
}

// TTS AI IMPLEMENTATION ENDS HERE * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 


// Test Call to Test API
router.post('/analyze-image', async (req, res) => {
    const { image: base64Image, language:language_val } = req.body; // Here, 'image' is the base64-encoded image data

    // Convert base64 to a buffer and then to a file
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const tempFileName = uuidv4() + '.jpg'; // Generate a unique file name
    const tempFilePath = path.join(os.tmpdir(), tempFileName); // Construct temp file path

    fs.writeFileSync(tempFilePath, imageBuffer); // Write file to temp directory

    try {
        // Now use tempFilePath with your Google Vision API call
        let textOnBottle = await bottle_text(tempFilePath); // Assuming this function is modified to use filePath
        
        // Optionally, delete the temp file after processing
        fs.unlinkSync(tempFilePath);
        // let language = "english";
        // Respond with your results
        const user = null;
        // const user = await User.findOne({
        //     $or: [{ username: login }]
        // });
        let default_info = null;
        let medicals = "";
        if(user){
            medicals = await user.getMedicals();
            
        }



        if (textOnBottle === "Too many containers detected."){
            default_info = "There's too many bottles in the image. Try taking a picture of the bottle against a background."
            default_info = await translate(default_info, language_val);

        }
        else if (textOnBottle === "No containers detected.") {
            default_info = "We don't see any bottles in the image. Try taking a closer picture."
            default_info = await translate(default_info, language_val);

        }
        else{
            if(medicals != ""){
                let med_prompt = "The following text is the label of a medicinal bottle or product. Briefly answer the following questions:\n 1. What is this medication and what is it used for?\n 2. What should someone taking this medication be aware of?\n 3. How often should this person take this medication? 4. How may this medication affect the user based on medical notes?"
                med_prompt = "The following is user information regarding prescription and doctor notes respectively:\n" + medicals.prescription + "\n" + medicals.notes + "\n\n" + med_prompt
                default_info = await basic_query(textOnBottle, language = language_val);
            }
            else{
                default_info = await basic_query(textOnBottle, language = language_val);
            }
        }
        const mp3_file = uuidv4() + '.mp3'; // Generate a unique file name
        // const mp3TempFilePath = path.join(os.tmpdir(), mp3_file); // Construct temp file path
        const mp3TempFilePath = path.join("public/", mp3_file); // Construct temp file path
        await read_text(default_info, voice_options[language_val]["f"],mp3TempFilePath); // TEST THIS FIRST

        const sound_url =  mp3_file;
        console.log(sound_url);
        


        // fs.writeFileSync(mp3TempFilePath, imageBuffer); // Write file to temp directory

        console.log(mp3TempFilePath)
        res.json({ message: 'Analysis completed', data: default_info, sound: sound_url });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ message: 'Error processing image', error: error.message });

        // Ensure temp file is deleted even on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});

/*
async function main(){
    (async () => {
        console.log(await test_call('IMG_20240209_192442.jpg'));
    })();
}
*/

module.exports = router;