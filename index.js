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
}

main();

app.listen(process.env.port || 3000, function () {
    console.log("server has started");
})