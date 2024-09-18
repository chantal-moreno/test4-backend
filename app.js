const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dbConnect = require('./db/dbConnect');
const User = require('./db/userModel');
const auth = require('./auth');

dbConnect();

// CORS (Cross-Origin Resource Sharing)
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization'
  );
  response.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  if (request.method === 'OPTIONS') {
    return response.sendStatus(200);
  }
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (request, response, next) => {
  response.json({ message: 'Hey! This is your server response!' });
  next();
});

app.post('/register', async (request, response) => {
  const {
    firstName,
    lastName,
    email,
    password,
    position = 'Other',
    status = 'Active',
  } = request.body;

  // Verify that all required fields are present
  if (!firstName || !lastName || !email || !password) {
    return response.status(400).send({
      message:
        'Missing required fields: firstName, lastName, email, and password are required.',
    });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      position,
      status,
    });

    // Save new user
    const result = await user.save();
    response.status(201).send({
      message: 'User Created Successfully',
      result,
    });
  } catch (error) {
    response.status(500).send({
      message: 'Error creating user',
      error: error.message,
    });
  }
});
app.post('/login', async (request, response) => {
  try {
    // Search user by email
    const user = await User.findOne({ email: request.body.email });

    if (!user) {
      return response.status(404).send({
        message: 'Email not found',
      });
    }

    const passwordCheck = await bcrypt.compare(
      request.body.password,
      user.password
    );

    if (!passwordCheck) {
      return response.status(400).send({
        message: 'Password does not match',
      });
    }
    if (user.status == 'Blocked') {
      return response.status(403).send({
        message: 'User account is blocked',
      });
    }
    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
        userEmail: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    //Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    return response.status(200).send({
      message: 'Login Successful',
      id: user.id,
      email: user.email,
      token,
    });
  } catch (error) {
    return response.status(500).send({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
});
app.get('/admin-panel', auth, async (request, response) => {
  try {
    const users = await User.find({}).select(
      'firstName lastName email position lastLogin status'
    );

    response.status(200).json({
      message: 'Users retrieved successfully',
      users,
    });
  } catch (error) {
    response.status(500).json({
      message: 'Error retrieving users',
      error: error.message,
    });
  }
});

app.post('/block-users', async (req, res) => {
  const { userIds } = req.body;
  try {
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { status: 'Blocked' } }
    );
    res.status(200).json({ message: 'Users blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error blocking users', error });
  }
});
app.post('/unlock-users', async (req, res) => {
  const { userIds } = req.body;
  try {
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { status: 'Active' } }
    );
    res.status(200).json({ message: 'Users unlocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unlocking users', error });
  }
});
app.delete('/delete-users', async (req, res) => {
  const { userIds } = req.body;
  try {
    await User.deleteMany({ _id: { $in: userIds } });
    res.status(200).json({ message: 'Users eliminated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminating users', error });
  }
});

module.exports = app;

