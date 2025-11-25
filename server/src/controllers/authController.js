const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CustomField = require('../models/CustomField');

const buildToken = (user) => {
  const payload = {
    id: user._id,
    role: user.role,
    phone: user.phone,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'exam-secret', {
    expiresIn: '7d',
  });

  return token;
};

// Validate phone number - must be exactly 10 digits
const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
};

// Student Signup
const signup = async (req, res) => {
  try {
    const { name, phone, password, customFields } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone, and password are required' });
    }

    // Validate phone number - must be exactly 10 digits
    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists - one phone number can only have one account
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'This phone number is already registered. Please login instead.',
        code: 'PHONE_ALREADY_EXISTS'
      });
    }

    // Validate custom fields if enabled
    const enabledFields = await CustomField.find({ isEnabled: true }).sort({ order: 1 });
    const customFieldsData = {};
    
    for (const field of enabledFields) {
      const value = customFields?.[field.fieldName];
      
      if (field.isRequired && (!value || value.trim() === '')) {
        return res.status(400).json({ 
          message: `${field.fieldLabel} is required`,
          field: field.fieldName
        });
      }
      
      if (value) {
        customFieldsData[field.fieldName] = value;
      }
    }

    // Create new student user
    const user = await User.create({
      name,
      phone,
      password,
      customFields: customFieldsData,
      role: 'student',
    });

    const token = buildToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('signup error', error);
    // MongoDB duplicate key error (unique constraint violation)
    if (error.code === 11000 || error.code === 11001) {
      return res.status(400).json({ 
        message: 'This phone number is already registered. Please login instead.',
        code: 'PHONE_ALREADY_EXISTS'
      });
    }
    return res.status(500).json({ message: 'Failed to create account' });
  }
};

// Login (for both students and admin)
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' });
    }

    // Validate phone number - must be exactly 10 digits
    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    // Find user with password field
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }

    const token = buildToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'Failed to login' });
  }
};

const getCustomFieldsForSignup = async (_req, res) => {
  try {
    const fields = await CustomField.find({ isEnabled: true })
      .sort({ order: 1, createdAt: 1 });
    res.json(fields);
  } catch (error) {
    console.error('getCustomFieldsForSignup error', error);
    res.status(500).json({ message: 'Failed to load custom fields' });
  }
};

module.exports = {
  signup,
  login,
  getCustomFieldsForSignup,
};

