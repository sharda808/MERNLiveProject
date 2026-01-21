const { check } = require("express-validator");

  // First Namevalidator
  exports.firstNameValidation = check('firstName')
    .trim().notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 chars')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name must contain only letters');
  // last name Validator
  exports.lastNameValidation =check('lastName')
    .trim()
    .matches(/^[a-zA-Z\s]*$/).withMessage('Last name must contain only letters'),
// Email validator
  exports.emailValidation =check('email')
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
// password Validator
  exports.passwordValidation =check('password')
    .trim()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 chars')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[!@#$^&*_":?]/).withMessage('Password must contain a special character'),
// Confirm Password Validator
  exports.confirmPasswordValidation =check('confirm_password')
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
// User type Validator
  exports.userTypeValidation =check('userType')
    .trim().notEmpty().withMessage('User type required')
    .isIn(['guest', 'host']).withMessage('Invalid user type'),
// Terms and Condition Validator
  exports.termsAcceptedValidation =check('termsAccepted')
    .notEmpty().withMessage('Terms must be accepted')