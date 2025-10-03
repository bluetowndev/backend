const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const requireAuth = async (req, res, next) => {
  // verify user is authenticated
  const { authorization } = req.headers

  if (!authorization) {
    return res.status(401).json({error: 'Authorization token required'})
  }

  // Check if authorization header starts with 'Bearer '
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({error: 'Invalid authorization format. Expected: Bearer <token>'})
  }

  const token = authorization.split(' ')[1]

  // Check if token exists
  if (!token) {
    return res.status(401).json({error: 'Token not found in authorization header'})
  }

  try {
    const { _id } = jwt.verify(token, process.env.SECRET)

    req.user = await User.findOne({ _id }).select('_id')
    next()

  } catch (error) {
    console.log('JWT Error:', error.message)
    res.status(401).json({error: 'Invalid or expired token'})
  }
}

module.exports = requireAuth