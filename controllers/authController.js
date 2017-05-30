const mongoose = require('mongoose');
const passport = require('passport');
const crypto = require('crypto');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Login failed.',
  successRedirect: '/',
  successFlash: 'You are now logged in.'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out.');
  res.redirect('/');
};


exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash('error', 'You are not logged in.');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // flash message can be changed to say password link was sent even if no user was found
    req.flash('error', 'The email you entered is not registered.');
    res.redirect('/login');
    return;
  }
  user.passwordResetToken = crypto.randomBytes(20).toString('hex');
  user.passwordResetExpiry = Date.now() + 3600000;
  await user.save();
  const resetURL = `http://${req.headers.host}/account/reset/${user.passwordResetToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  });
  req.flash('success', 'A password reset link has been sent to your email... No, not really... This is a practice app!');
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpiry: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid or expired.');
    res.redirect('login');
    return;
  }
  res.render('reset', { title: 'Reset your password' });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match.');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpiry: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid or expired.');
    res.redirect('login');
    return;
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Your password has been reset successfully.');
  res.redirect('/');
};
