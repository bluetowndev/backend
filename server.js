require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const attendanceRoutes = require('./routes/attendance');
const userRoutes = require('./routes/user');
const bodyParser = require('body-parser');
const cors = require('cors');

// express app
const app = express();

// Define allowed origins based on environment
const allowedOrigins = [
  'https://ats-fe-1om7.onrender.com', // Production frontend URL
  'http://localhost:3000' // Local development frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// middleware
app.use(express.json());
app.use(bodyParser.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

// routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/user', userRoutes);

// connect to db
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    // listen for requests
    app.listen(process.env.PORT, () => {
      console.log('connected to db & listening on port', process.env.PORT);
    });
  })
  .catch((error) => {
    console.log(error);
  });
