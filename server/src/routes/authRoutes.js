const express = require('express');
const { signup, login, getCustomFieldsForSignup } = require('../controllers/authController');

const router = express.Router();

router.get('/custom-fields', getCustomFieldsForSignup);
router.post('/signup', signup);
router.post('/login', login);

module.exports = router;

