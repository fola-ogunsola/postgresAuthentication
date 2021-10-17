const express = require('express');
const uuid = require('uuid').v4
const session = require('express-session')
const FileStore = require('session-file-store')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
// create the server
const app = express();
const db = require("./config/db.config.js");
const bcrypt = require('bcrypt-nodejs');
const axios = require('axios');

// configure passport.js to use the local strategy

passport.use(new LocalStrategy( { usernameField: 'email' }, (email, password, cb) => {
    db.oneOrNone('SELECT id, email, password FROM users WHERE email= $1', [email])
    .then((result) => {
      if(result) {
        if(password == result.password) {
          cb(null, { id: result.id, email: result.email })
        }
        else {
          cb(null, false)
        }
      }
      else {
        cb(null, false)
      }
    }).
    catch((err) => {
      console.log('Error when selecting user on login', err)
      return cb(err)
    })
}))
passport.serializeUser((result, cb) => {
    cb(null, result.id)
  }) 

passport.deserializeUser((id, cb) => {
    db.oneOrNone('SELECT id, email FROM users WHERE id = $1', [id], function(err, result){
      if(err){
        console.log(err);
        return cb(null,err);
    }
    cb(null, result[0]);
    })

  })
// add & configure middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(session({
  genid: (req) => {
    return uuid() // use UUIDs for session IDs
  },
  //store: new FileStore(),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

// create the homepage route at '/'
app.get('/', (req, res) => {
  res.send(`You got home page!\n`)
})

app.post('/blog', createArticle);
function createArticle(req, res){
    db.any('INSERT INTO users(id, email, password) VALUES($1, $2, $3)', [req.body.id, req.body.email, req.body.password])
    // return res.status(201).json(req)
    .then(function(data){
      console.log(data, 'data')
      return res.status(200).json(data);
  })
  .catch(function(error){
      console.log(error)
  })
}
// create the login get and post routes
app.get('/login', (req, res) => {
  res.send(`You got the login page!\n`)
})

app.post('/login', (req, res, next) => {
  console.log(req.body, 'body');

  passport.authenticate('local', (err, user, info) => {
    if(info) {return res.send(info.message)}
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.login(user, (err) => {
      if (err) { return next(err); }
      return res.redirect('/authrequired');
    })
  })(req, res, next);
})

app.get('/authrequired', (req, res) => {
  if(req.isAuthenticated()) {
    res.send('you hit the authentication endpoint\n')
  } else {
    res.redirect('/')
  }
})

// tell the server what port to listen on
app.listen(3500, () => {
  console.log('Listening on localhost:3500')
})