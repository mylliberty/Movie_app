const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: String,
    description: String,
    image1: String,
    image2: String,
    image3: String,
    trailer: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
});

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;