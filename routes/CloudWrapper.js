// Imports
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 
const express = require('express');
const vision = require('@google-cloud/vision');
const { readFileSync } = require('fs');
const bodyParser = require('body-parser');
const sizeOf = require('image-size');
const router = express();

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

const client = new vision.ImageAnnotatorClient(CONFIG);


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

// Test Call to Test API
router.post('/analyze-image', async (req, res) => {
    const { image: base64Image } = req.body; // Here, 'image' is the base64-encoded image data

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

        // Respond with your results
        res.json({ message: 'Analysis completed', data: textOnBottle });
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ message: 'Error processing image', error: error.message });

        // Ensure temp file is deleted even on error
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
});
  




/**
 * 
 * @param {string} file_path to the image
 * @returns text written on Packaged Goods container
 */
const bottle_text = async (file_path) => {

    // Detect text from given image and grab annotations
    let [text_result] = await client.textDetection(file_path);
    text_result = text_result.textAnnotations

    const request = {
        image: { content: readFileSync(file_path) },
    };

    const [locali_result] = await client.objectLocalization(request);
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

/*
async function main(){
    (async () => {
        console.log(await test_call('IMG_20240209_192442.jpg'));
    })();
}
*/

module.exports = router;