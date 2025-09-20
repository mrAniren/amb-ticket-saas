const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Hall validation rules
const validateHall = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Hall name is required and must be less than 255 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('City must be less than 255 characters'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters'),
  handleValidationErrors
];

// Zone validation rules
const validateZone = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Zone name is required and must be less than 255 characters'),
  body('color')
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color (e.g., #FF0000)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors
];

// Seat validation rules
const validateSeats = [
  body('seats')
    .isArray()
    .withMessage('Seats must be an array'),
  body('seats.*.css_selector')
    .trim()
    .isLength({ min: 1 })
    .withMessage('CSS selector is required for each seat'),
  body('seats.*.object_type')
    .optional()
    .isIn(['seat', 'scene', 'decoration', 'passage'])
    .withMessage('Object type must be one of: seat, scene, decoration, passage'),
  body('seats.*.seat_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seat number must be a positive integer'),
  body('seats.*.row_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Row number must be a positive integer'),
  handleValidationErrors
];

// ID parameter validation (for MongoDB ObjectId)
const validateId = [
  param('id')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('ID must be a valid MongoDB ObjectId');
      }
      return true;
    }),
  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('username')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Username is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  handleValidationErrors
];

module.exports = {
  validateHall,
  validateZone,
  validateSeats,
  validateId,
  validateLogin,
  handleValidationErrors
};