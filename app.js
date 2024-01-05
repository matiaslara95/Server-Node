const express = require('express')
const app = express();
const cloudinary = require('cloudinary').v2
const bodyParser = require('body-parser');
require('dotenv').config();
const db = require('./services/dbConnect');

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
// app.post("/upload-image", (request, response) => {

//     const data = {
//         image: request.body.image
//     }

//     //here the program uploads the image
//     cloudinary.uploader.upload(data.image)
//         .then((result) => {
//             response.status(200).send({
//                 message: 'Success',
//                 result,
//             });
//         }).catch((error) => {
//             response.status(500).send({
//                 message: "failure",
//                 error,
//             });
//         });
// });

// persist image 
app.post("/persist-image", (request, response) => {
    // collected image from a user
    const data = {
        title: request.body.title,
        image: request.body.image
    }

    // upload image here
    cloudinary.uploader.upload(data.image)
        .then((image) => {
            db.pool.connect((err, client) => {
                //Insert query to run if the cloudinary is successfull
                const insertQuery = `INSERT INTO images (title, cloudinary_id, image_url)
                 VALUES ($1, $2, $3) RETURNING *`;

                //The image.public_id and image.secure_url are gotten as part of the details returned 
                //for an image after the image has been successfully uploaded to Cloudinary.
                const values = [data.title, image.public_id, image.secure_url];

                // execute query
                client.query(insertQuery, values)
                    .then((result) => {
                        result = result.rows[0];

                        // send success response
                        response.status(201).send({
                            status: "success",
                            data: {
                                message: "Image Uploaded Successfully",
                                title: result.title,
                                cloudinary_id: result.cloudinary_id,
                                image_url: result.image_url,
                            },
                        })
                    }).catch((e) => {
                        response.status(500).send({
                            message: "failure",
                            e,
                        });
                    })
            })
        }).catch((error) => {
            response.status(500).send({
                message: "failure",
                error,
            });
        });
});

app.get("/retrieve-image/:cloudinary_id", (request, response) => {
    //data from the user
    const { cloudinary_id } = request.params;

    db.pool.connect((err, client) => {
        //query to find image
        const selectQuery = "SELECT * FROM images WHERE cloudinary_id = $1";
        const selectValue = [cloudinary_id];

        //execute query
        client.query(selectQuery, selectValue)
            .then((output) => {
                response.status(200).send({
                    status: "success",
                    data: {
                        id: output.rows[0].cloudinary_id,
                        title: output.rows[0].title,
                        url: output.rows[0].image_url,
                    },
                });
            })
            .catch((error) => {
                response.status(401).send({
                    status: "failure",
                    data: {
                        message: "could not retrieve record!",
                        error,
                    },
                });
            });
    })
})

app.delete("/delete-image/:cloudinary_id", (request, response) => {
    //data from the user
    const { cloudinary_id } = request.params;

    cloudinary.uploader
        .destroy(cloudinary_id)
        // delete image record from postgres also
        .then(() => {
            db.pool.connect((err, client) => {
                //query to find image
                const deleteQuery = "DELETE FROM images WHERE cloudinary_id = $1";
                const deleteValue = [cloudinary_id];

                //execute delete query
                client.query(deleteQuery, deleteValue)
                    .then((deleteResult) => {
                        response.status(200).send({
                            message: "Image Deleted Successfully!",
                            deleteResult
                        });
                    }).catch((e) => {
                        response.status(500).send({
                            message: "Image Couldn't be Deleted!",
                            e
                        });
                    });
            })
        })
        .catch((error) => {
            response.status(500).send({
                message: "Failure",
                error,
            });
        });
})

app.put("/update-image/:cloudinary_id", (request, response) => {
    const { cloudinary_id } = request.params;

    //collected image from a user
    const data = {
        title: request.body.title,
        image: request.body.image
    }

    // delete image from cloudinary first
    cloudinary.uploader
        .destroy(cloudinary_id)
        // upload image here
        .then(() => {
            cloudinary.uploader
                .upload(data.image)
                // update the database here
                .then((result) => {
                    db.pool.connect((err, client) => {

                        // update query
                        const updateQuery =
                            "UPDATE images SET title = $1, cloudinary_id = $2, image_url = $3 WHERE cloudinary_id = $4";
                        const value = [
                            data.title,
                            result.public_id,
                            result.secure_url,
                            cloudinary_id,
                        ];

                        // execute query
                        client.query(updateQuery, value)
                            .then(() => {

                                // send success response
                                response.status(201).send({
                                    status: "success",
                                    data: {
                                        message: "Image Updated Successfully"
                                    },
                                });
                            })
                            .catch((e) => {
                                response.status(500).send({
                                    message: "Update Failed",
                                    e,
                                });
                            });
                    });
                })
                .catch((err) => {
                    response.status(500).send({
                        message: "failed",
                        err,
                    });
                });
        })
        .catch((error) => {
            response.status(500).send({
                message: "failed",
                error,
            });
        });
});

module.exports = app; 