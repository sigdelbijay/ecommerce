const jwt = require('jsonwebtoken') //to generate signed token
const expressJwt = require('express-jwt') //for authorization check
const User = require('../models/user')
const {errorHandler} = require('../helpers/dbErrorHandler')
exports.signup = (req, res) => {
  // console.log("req.body", req.body)
  const user = new User(req.body)
  user.save((err, user) => {
    if (err) {
      return res.status(400).json({
        err: errorHandler(err)
      })
    }
    user.salt = undefined
    user.hashed_password = undefined
    res.json({user})
  })
}

exports.signin = (req, res) => {
  //find the user based on email
  const {email,password} = req.body
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.statu(400).json({
        error: 'User with this email does not exist. Please signup'
      })
    }
    //if user found match email and password
    //create authenticate method in user model
    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: 'Email and password does not match'
      })
    }

    //generate a signed token with user id and secret
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET)
    //persist the token as 't' in cookie with expiry date
    res.cookie('t', token, { expire: new Date() + 9999 })
    const {_id, name, email, role} = user
    return res.json({token, user: {_id, name, email, role}})
  })
}

exports.signout = (req, res) => {
  res.clearCookie('t')
  res.json({message: 'Signout success'})
}

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"], // must be set for express-jwt to authorize token
  userProperty: "auth",
});

exports.isAuth = (req, res, next) => {
  // console.log("req.auth", req.auth)
  // console.log("req.profile", req.profile)
  let user = req.profile && req.auth && req.profile._id == req.auth._id //if the userId it is trying to access and the logged in user is the same
  if (!user) {
    return res.status(403).json({
      error: "Access denied"
    })
  }
  next()
}

exports.isAdmin = (req, res, next) => {
  if (req.profile.role !== 1) {
    return res.status(403).json({
      error: "Admin resource! Access denied"
    })
  }
  next()
}