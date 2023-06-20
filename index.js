const express = require('express');
const ejs = require('ejs');
const dotenv = require('dotenv').config();
const mysql = require('mysql2/promise');


const app = express();

//  enable static files 
app.use(express.static('public'));

// enable form processing
app.use(express.urlencoded({
    extended: false
}));




// set the view engine
app.set('view engine', 'ejs');

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


}

main();

app.listen(process.env.port || 3000, function () {
    console.log("server has started");
})