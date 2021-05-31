"use strict"
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const session = require('express-session')
const port = process.env.PORT || 3000

/* Mongo */
const MongoClient = require('mongodb').MongoClient;
const user = "ifocop:ifocop"
const url = "mongodb+srv://" + user + "@jeuifocop.ea8mi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const database = 'jeuIfocop'
const myCollection = 'utilisateurs'


/*
**********************************************
**********************************************
**************** ExpressJS *******************
**********************************************
**********************************************
*/

var navObject = {
  'Accueil': 'index',
  'Connexion': 'authpage',
  'Inscription': 'signpage',
  'Déconnexion': 'deconnexion'
}

// Get user session
var userSession;
// Pug init, require npm install pug
app.set('view engine', 'pug')
app.use('/scripts', express.static(__dirname + '/scripts/'))
// obligatoire pour utiliser post
app.use(express.urlencoded({
  extended: false
}));
// Obligatoire pour récupérer les données des sessions de connexion/cookies
app.use(session({
  secret: 'secretpassword',
  resave: false,
  saveUninitialized: true
}));

// ***************************************
// *************** l'Accueil ***********
// *****************************************

app.get(['/', '/index'], (req, res) => {
  // on recupere 'session' dans la req
  userSession = req.session
  // render avec la session prise de userSession, transformation en string de la valeur .user via JSON.stringify
  res.render('index', { session: JSON.stringify(userSession.user), navObject })
})
//**************************************************
//*********** La page d'authentification *********
//************************************************

app.get('/authpage', (req, res) => {
  // on recupere 'session' dans la req
  userSession = req.session
  // controle si la session utilisateur existe, si oui retour vers index avec message
  if (userSession.user) {
    isConnected = true
    res.render('index', { class: 'green', text: 'Vous avez déjà un compte', navObject })
  } else {
    // si non render de la page d authentification
    res.render('authpage', { navObject })
  }

})


app.use(express.static("public"))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/*
**********************************************
**********************************************
**************** MongoDb *********************
**********************************************
**********************************************
*/

// gestion de connexion mongoclient . require npm install mongo-client



//La requête envoyée suite au remplissage du formulaire d'authentification pour les user qui ont déjà un compte, est envoyée en post et renvoie des réponses vers des pugs existants selon le cas de figure
app.post('/validation', (req, res, next) => {
  userSession = req.session
  MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
    
    // recherche dans la database de la correspondance de l'entree utilisateur et du mdp
    if (error) {
      console.log('Erreur de connection dans mongoclient de app.post("/validation")')
    } else {
      const collection = client.db(database).collection(myCollection)
      collection.find({ 'user': req.body.user, 'password': req.body.password }).toArray((err, data) => { // on transforme le resultat en tableau exploitable grace a .toArray
        if (data.length === 0) {
          res.render('authpage', { class: 'red', text: 'Votre identifiant et/ou mot de passe est (sont) erroné(s).', navObject })
        } else {
          userSession = req.session
          userSession.user = req.body.user
          res.render('index', { session: JSON.stringify(userSession.user), navObject })
        }
      })
    }
  })
})
// **********************************************************************
// ************** Inscription d'un nouvel utilisateur *********************
//***********************************************************************/

app.get('/signpage', (req, res) => {
  userSession = req.session
  if (userSession.user) {
    // si l'utilisateur est dans la DB alors on renvoit la page d'accuiel
    res.render('index', { class: 'green', text: 'Vous avez déjà un compte', navObject })
  } else {
    // sinon redirection vers la page d'inscription signpage
    res.render('signpage', { navObject })
  }
})

// **************************** Post pour inscription **************************

// La requête envoyée suite au remplissage du formulaire d'inscription est envoyée en post et renvoie des réponses vers des pugs existants selon le cas de figure 
app.post('/inscription', (req, res, next) => {
  userSession = req.session
  MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {

    if(error){
      console.log('une erreur mongo dans app.post("/inscription")')
    }else{
          const collection = client.db(database).collection(myCollection)
      collection.find({ 'user': req.body.user }).toArray((err, data) => {
        if(err){
          console.log('une erreur dans find de app.post("/inscription")')
        }else{
          if (data.length === 0) {
            // si pas de correspondance, creation d'un user + password et insertion dans la DB
            collection.insertOne({
              'user': req.body.user,
              'password': req.body.password,
              'points': 0
            })
            // ensuite renvoi vers la page d'authentification pour qu'il se connecte avec ses identifiants et mdp nouvelement créés
            res.render('authpage', { class: 'green', text: 'Votre compte est crée, vous pouvez vous connecter', navObject })
          } else {
            // Si utilisateur existe déjà avec l'id , alors on le renvoie vers la page d'authentification pour qu'il se connecte
            res.render('authpage', { class: 'green', text: 'Votre identifiant existe déjà, veuillez vous connecter', session: JSON.stringify(userSession.user), navObject })
          }
        }
      })
    }
    // recherche dans la database de la correspondance de l'entree utilisateur
  })
})

//**************************** Route permettant d'envoyer une réponse lorsque l'utilisateur souhaite se deconnecter ****************************
app.get('/deconnexion', (req, res) => {
  userSession = req.session
  // suppression de la propriete 'user' dans l'objet session de notre req
  req.session.destroy((err) => {
    if (err) {
      console.log('une erreur dans req.session.destroy')
    } else {
      // on renvoie la page d'accueil une fois déconnecté
      res.render('index', { text: 'Vous êtes bien déconnecté.', navObject });
    }
  });
})

/*
**********************************************
**********************************************
**************** socketio ********************
**********************************************
**********************************************
*/

// pour garder l user en memoire
let users = []

class MathKing {

  constructor() {
    this.number1 = parseInt(Math.random() * 10);
    this.number2 = parseInt(Math.random() * 10);
  }
  question() {
    return this.number1 + 'x' + this.number2 + '?';
  }
  answer() {
    return this.number1 * this.number2
  }

}
let mathDemon = new MathKing

let classement = []
function updateClassement() {

  MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
    if (error) {
      console.log('Il y a une erreur de connection avec le serveur')
      return
    } else {
      const collection = client.db(database).collection(myCollection)
      collection.find({}).sort(
        {
          "points": -1.0
        }
      ).toArray((err, data) => {
        if (err) {
          console.log('Il y a une erreur dans le array de la fonction updateClassement')
        } else {
          classement = []
          data.forEach(item => {
            classement.push({ user: item.user, points: item.points })
          })
          client.close()
        }
      })
      
    }
    
  }

  )
}
setInterval(() => {
  updateClassement()
}, 1000);

function addPoint(id) {
  users.forEach(user => {
    if (user.id === id) {
      console.log(user)
      user.points += 1
      MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
        if (error) {
          console.log('Une erreur dans la fonction addPoint')
        } else {
          const collection = client.db(database).collection(myCollection)
          collection.updateOne({ 'user': user.name }, { $inc: { 'points': 1 } })
          
        }
      })
    }
  });
}

function updateGame() {

  mathDemon = new MathKing
  io.emit('text', mathDemon.question())
  io.emit('classement', classement)

}

// gestion connection websocket
io.on('connection', (socket) => {
  console.log('is connected')
  // user_joined est dans script.js , envois le pseudo de l'user
  socket.on('user_joined', () => {
    let user = {
      id: socket.id,
      name: userSession.user,
      points: 0
    }
    console.log(user)
    users.push(user)
    updateGame()
  })

  // gestion de la réponse
  socket.on('response', (userResponse) => {

    userResponse = parseInt(userResponse)
    if (userResponse == mathDemon.answer()) {
      addPoint(socket.id)
      updateGame()
    }
  })

});


server.listen(port, () => {
  console.log('listening on :${port}');
});
