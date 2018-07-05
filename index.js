const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const app = express();
app.use(bodyParser.json());

mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/allocine"
);

// Mongoose Models definition
const User = mongoose.model("User", {
  email: String,
  token: String,
  hash: String,
  salt: String
});

const List = mongoose.model("List", {
  name: String,
  description: String,
  movies: [String],
  iduser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

app.get("/api/search", function(req, res) {
  // https://api.themoviedb.org/3/search/movie?api_key=2beab41aee4c7a7d70af16f2455e21c4&language=en-US&query=Amelie&page=1
  let URLrequest =
    "https://api.themoviedb.org/3/search/movie?api_key=2beab41aee4c7a7d70af16f2455e21c4&language=fr-FR&query=" +
    req.query.q +
    "&page=" +
    req.query.p;
  axios
    .get(URLrequest)
    .then(function(response) {
      res.json(response.data.results);
    })
    .catch(function(error) {
      console.log(error);
    });
});

app.get("/api/movies/:type", function(req, res) {
  //https://api.themoviedb.org/3/movie/popular?api_key=2beab41aee4c7a7d70af16f2455e21c4&language=fr-FR&page=1

  let URLrequest =
    "https://api.themoviedb.org/3/movie/" +
    req.params.type +
    "?api_key=2beab41aee4c7a7d70af16f2455e21c4&language=fr-FR&page=" +
    req.query.p;

  console.log(URLrequest);
  axios
    .get(URLrequest)
    .then(function(response) {
      res.json(response.data.results);
    })
    .catch(function(error) {
      console.log("error");
    });
});

// sign up module

app.post("/api/sign_up", function(req, res) {
  User.findOne({ email: req.body.email }).exec(function(err, user) {
    if (!err) {
      if (user) {
        if (
          user.hash ===
          SHA256(req.body.password + user.salt).toString(encBase64)
        ) {
          res.json({
            message: "user already exists, correct password",
            token: user.token
          });
        } else {
          res.json({
            message: "user already exists, but wrong password"
          });
        }
      } else {
        const token = uid2(10);
        const salt = uid2(64);
        const hash = SHA256(req.body.password + salt).toString(encBase64);
        const user = new User({
          email: req.body.email,
          token: token,
          hash: hash,
          salt: salt
        });
        user.save(function(err, obj) {
          if (!err) {
            res.json({
              message: "new user created",
              token: obj.token
            });
          } else {
            res.json({ error: "An error occurred" });
          }
        });
      }
    }
  });
});

app.post("/api/lists/add", function(req, res) {
  let bearerToken = req.headers.authorization;
  let providedToken = bearerToken.slice(7, bearerToken.length);
  User.findOne({ token: providedToken }).exec(function(err, user) {
    if (err) {
      res.json({ message: "error" });
    } else if (!user) {
      res.status(401).send({ error: "Erreur d'authentification" });
    } else {
      List.find({ iduser: user._id }).exec(function(err, lists) {
        if (err) {
          res.json(err);
        } else {
          for (let i = 0; i < lists.length; i++) {
            if (lists[i].name === req.body.name) {
              res.json({ message: "la liste existe deja" });
              return;
            }
          }

          const list = new List({
            name: req.body.name,
            description: req.body.description,
            iduser: user._id
          });
          list.save(function(err, obj) {
            if (!err) {
              // user.lists.push(obj.name);
              user.save();
              res.json(obj);
            } else {
              res.json({ error: "An error occurred" });
            }
          });
        }
      });
    }
  });
});

app.listen(process.env.PORT || 3000, function() {
  console.log("server started");
});
