const express = require('express');
const ejs = require('ejs');
const dotenv = require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const app = express();

//  enable static files 
app.use(express.static('public'));

// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// setup the session
// the `session` function is available thru the session package
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}))

// initialize passport
// Because passport requres session to be enabled,
// make sure to initialize passport after initialize the sessions
app.use(passport.initialize());
app.use(passport.session());



// set the view engine
app.set('view engine', 'ejs');

// a middleware is a function that accepts three arguments
// req, res, next
function ensureAuthenticated(req, res, next) {
    // isAuthenticated is added when we do app.use(passport.initialize())
    if (req.isAuthenticated()) {
        return next(); // go on to the middleware
    }
    // if user is not authenticated, we'll go back to the login route
    res.redirect('/login');
}


const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
}

async function main() {
    // mysql.createConnection is an asynchronous function
    // 1. it takes a long time to finish
    // 2. await allows us to tell JS to wait till the operation
    // is done before going on to the next line
    // 3. await can only be called in a function  marked as a async
    const db = await mysql.createConnection(dbConfig);
    console.log("database has been connected!");


    // setup strategy and serialize users and deserialize users
    // the strategy is to check if the user name and password is correct
    // when is triggered: when user logins
    passport.use(new LocalStrategy(async function(username, password, done){
        // implement the logic to check if the provided username and password are valid
        const sql = 'SELECT * FROM users WHERE username = ?';
        const [user] = await db.query(sql, [username]);
        // if the user with the provided username does not exist, then it
        // means the username is invalid
        if (user.length == 0) {
            return done(null, false, {message:"Incorrect username"});
        }

        // compare the password 
        // bcrypt.compare can check whether a plain text string is the same
        // as a hashed string
        const match = await bcrypt.compare(password, user[0].password);
        if (!match) {
            // password does not match
            return done(null, false, {message:"Incorrect password"});
        }
        return done(null, user[0]);  // the second argument will contain the actual user object
    }));

    // serialize: store identiying information about the user when they log in
    // is trigger: when a user logins successful

    passport.serializeUser(function(user, done){
        done(null, user.id); // when done() is called will save the identifying
                            // information (the second argument) into the session
    })

    // deserialize: given an identifying information, get the user 
    // triggered when: after the user has logged in and they visit another route
    passport.deserializeUser(async function(id, done){
        const [user] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        done(null, user[0]);  // <-- save the identifyig information (2nd arugment) into the session
    })

    // setup the routes
    app.get('/', async function (req, res) {
        try {
            // db.query actuallys return an array
            // the first element is the results (i.e the rows)
            // the second element are meta-data
            // instead of the following:
            // const results = await db.query("SELECT * FROM artists");
            // const artists = results[0];
            // instead we can use destructuring:
            const [artists] = await db.query("SELECT * FROM artists");

            console.log(artists);

            // If we use res.send on an array or an object, it will convert
            // it to JSON
            res.render("artists", {
                "artists": artists
            })

        } catch (e) {
            console.log("Error =>", e);
            res.status(500);  // allows us to send back the response with a HTTP code
            res.send('Internal Server Error');
        }
    })

    // render a form that allow us to add in a new artist
    app.get('/artists/create', function(req,res){
        res.render('create_artist');
    })

    app.post('/artists/create', async function(req,res){
        // extract out the values of the fields
        const {name, birth_year,country} = req.body;

        // write the query
        const sql = `INSERT INTO artists (name, birth_year, country) 
                       VALUES (?,?,?)`;

        // execute the query on the database
        await db.query(sql, [name, birth_year, country]);
        res.redirect('/');
    })

    // all the following URLs will match the following route path
    // /artists/123/update  (req.params.artist_id => 123)
    app.get('/artists/:artist_id/update', async function(req,res){
        const {artist_id} = req.params;
        const sql = "SELECT * FROM artists WHERE id=?";
        // query using mysql2 we always get back an array
        const [artists] = await db.query(sql, [artist_id]);
        // to get the artist we want to update, we retrieve from index 0
        const artist = artists[0];
        res.render('update_artist', {
            artist
        })
    })

    app.post('/artists/:artist_id/update', async function(req,res){
        const { name, birth_year, country, preferred_medium} = req.body;
        const { artist_id } = req.params;
        const sql = `UPDATE artists SET name=?, birth_year=?, country=?, preferred_medium=?
                     WHERE id = ?
        `
        await db.query(sql, [name, birth_year, country, preferred_medium, artist_id]);
        res.redirect('/');
    });

    app.get('/artists/:artist_id/delete', async function(req,res){
        const {artist_id} = req.params;
        const sql = "SELECT * FROM artists WHERE id = ?";
        // whenever we do a SELECT we always have an array
        const [artists] = await db.query(sql, [artist_id]);
        const artist = artists[0];
        res.render('confirm_delete', {
            artist
        })
     })

     app.post('/artists/:artist_id/delete', async function(req,res){
        const {artist_id} = req.params;
        const sql = "DELETE FROM artists WHERE id = ?";
        await db.query(sql, [artist_id]);
        res.redirect('/');
     });

     // register a new user
     app.get('/register', function(req,res){
        res.render('register');
     });

     app.post('/register', async function(req,res){
        const {username, email, password} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, 4)";
        await db.query(sql, [username, hashedPassword, email]);
        res.redirect('/login');
     })

     app.get('/login', function(req,res){
        res.render('login')
     })

     app.post('/login', function(req, res, next){
        // start the entire flow of
        // 1. triggering the localstrategy (test if username and password is valid)
        // 2. localstrategy if on successful login -> serializeUser
        //
        // passport.authenticate has two arugments
        // 1. first arugment: which strategy to authenticate
        // 2. second argument: a callback function that is invoked on a successful
        // or failure to login

        const doLogin = function(err, user, info){
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.redirect('/login');
            }
            // login function is provided by passport
            // if successful, triggers serializeUser
            req.login(user, (err)=>{
                if (err) {
                    return next(err);
                }
                return res.redirect('/');
            })

        }

        // passport.authenticate('local', doLogin)(req, res, next);

        const  executeLogin = passport.authenticate('local', doLogin );
        executeLogin(req, res, next);
     })

     app.get('/logout', function(req,res){
        req.logout(function(e){
            if (e) {
                console.error("Error destroying session:", err);
                return res.status(500).send('Error destroying session');
            } else {
                res.redirect('/login');
            }
        });
     })

     // if app.get or app.post has three arugments
     // then the middle argument is the middelware to run
     // BEFORE executing the route function
     app.get('/profile', ensureAuthenticated, async function(req,res){
        const user = req.user;  // app.use(passport.session()) it will
                                // call deserializeUser if a session_id is
                                // found in the request
        res.render('profile', {
            user
        })
     })
}

main();

app.listen(process.env.port || 3000, function () {
    console.log("server has started");
})