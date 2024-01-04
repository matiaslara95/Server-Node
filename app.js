const express = require('express')
const app = express();
const cloudinary = require('cloudinary').v2
const bodyParser = require('body-parser');
require('dotenv').config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Cloudinary configuration          
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

app.get("/", (request, response) => {
    response.json({ message: 'Server working!' });
})

//Image upload API
app.post("/upload-image", (request, response) => {

    const data = {
        image: request.body.image
    }

    //here the program uploads the image
    cloudinary.uploader.upload(data.image)
        .then((result) => {
            response.status(200).send({
                message: 'Success',
                result,
            });
        }).catch((error) => {
            response.status(500).send({
                message: "failure",
                error,
            });
        });
});

app.get("/download-image", (request, response) => {
    // cloudinary.utils.download_archive_url
})


module.exports = app; 