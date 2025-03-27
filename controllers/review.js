const Review = require('../models/Review');

// Create a new review session
exports.createReview = async (req, res) => {
    const { title, description } = req.body;
    try {
        const newReview = new Review({ title, description });
        await newReview.save();
        res.status(201).json({ message: 'Review session created successfully', review: newReview });
    } catch (error) {
        res.status(500).json({ message: 'Error creating review session', error });
    }
};

// Get all review sessions
exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find();
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reviews', error });
    }
};
