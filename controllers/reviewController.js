const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.storeId;
  const newReview = new Review(req.body);
  await newReview.save();
  req.flash('success', 'Your review has been added successfully.');
  res.redirect('back');
};
