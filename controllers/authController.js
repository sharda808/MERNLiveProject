const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const sendGrid = require('@sendgrid/mail');
const { firstNameValidation, lastNameValidation, emailValidation, passwordValidation, confirmPasswordValidation, userTypeValidation, termsAcceptedValidation } = require('./validation');

const MILLIS_IN_MINUTE = 60 * 1000;
const SEND_GRID_KEY = process.env.SENDGRID_API_KEY;
sendGrid.setApiKey(SEND_GRID_KEY);

exports.getLogin = (req, res, next) => {
  res.render('auth/login', { pageTitle: 'Login', isLoggedIn: false });
};


exports.getForgotPassword = (req, res, next) => {
  res.render('auth/forgot', { pageTitle: 'Forgot Password', isLoggedIn: false });
};


exports.getResetPassword = (req, res, next) => {
  const { email } = req.query;
  res.render('auth/reset_password', {
    pageTitle: 'Reset Password',
    isLoggedIn: false,
    email
  });
};

// POST Reset Password
exports.postResetPassword = [
 passwordValidation,
confirmPasswordValidation,
  async (req, res, next) => {
    const { email, otp, password } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render('auth/reset_password', {
        pageTitle: 'Reset Password',
        isLoggedIn: false,
        email,
        errorMessages: errors.array().map(err => err.msg),
      });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) throw new Error('User not found');
      if (!user.otpExpiry || user.otpExpiry < Date.now()) throw new Error('OTP expired');

      const inputOtp = (otp || '').trim();
      const storedOtp = (user.otp || '').trim();
      if (!inputOtp || storedOtp !== inputOtp) throw new Error('OTP does not match');

      user.password = await bcrypt.hash(password, 12);
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      res.redirect('/auth/login');
    } catch (err) {
      res.render('auth/reset_password', {
        pageTitle: 'Reset Password',
        isLoggedIn: false,
        email,
        errorMessages: [err.message]
      });
    }
  }
];

// POST Forgot Password
exports.postForgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 20 * MILLIS_IN_MINUTE;
    await user.save();

    const forgotEmail = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'OTP to reset your password',
      html: `<h1>OTP is: ${otp}</h1>
             <p>Enter this OTP on <a href="http://localhost:3000/auth/reset-password?email=${email}">Reset Password</a> page</p>`
    };

    await sendGrid.send(forgotEmail);
    res.redirect(`/auth/reset-password?email=${email}`);
  } catch (err) {
    res.render('auth/forgot', {
      pageTitle: 'Forgot Password',
      isLoggedIn: false,
      errorMessages: [err.message]
    });
  }
};

// Signup Page
exports.getSignup = (req, res, next) => {
  res.render('auth/signup', { pageTitle: 'Signup', isLoggedIn: false, oldInput: {}, errorMessages: [] });
};

// POST Signup
exports.postSignup = [
firstNameValidation,
lastNameValidation,
emailValidation,
passwordValidation,
confirmPasswordValidation,
userTypeValidation,
termsAcceptedValidation,
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('auth/signup', {
        pageTitle: 'Signup',
        isLoggedIn: false,
        errorMessages: errors.array().map(err => err.msg),
        oldInput: req.body
      });
    }

    try {
      const { firstName, lastName, email, password, userType } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({ firstName, lastName, email, password: hashedPassword, userType });
      await user.save();

      await sendGrid.send({
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Welcome to Apna Airbnb!',
        html: `<h1>Welcome ${firstName} ${lastName}!  
        I hope Enjoy your vocation at this Imagine home.
        </h1>`
      });

      res.redirect('/auth/login');
    } catch (err) {
      res.status(422).render('auth/signup', {
        pageTitle: 'Signup',
        isLoggedIn: false,
        errorMessages: [err.message],
        oldInput: req.body
      });
    }
  }
];

// POST Login
exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Incorrect password');

    req.session.isLoggedIn = true;
    // Store a plain object in session so EJS can reliably read userType, _id, etc.
    req.session.user = {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
    };
    await req.session.save();

    res.redirect('/');
  } catch (err) {
    res.render('auth/login', {
      pageTitle: 'Login',
      isLoggedIn: false,
      errorMessages: [err.message]
    });
  }
};

// Logout
exports.postLogout = (req, res, next) => {
  req.session.destroy();
  res.redirect('/auth/login');
};




 



  



  
