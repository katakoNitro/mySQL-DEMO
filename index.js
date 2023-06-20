const express = require('express');
const ejs = require('ejs');
const dotenv = require('dotenv').config();
const mysql = require('mysql2/promise');

const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: false
}));
app.set('view engine', 'ejs');

app.get('/', function(req,res){
    res.send("Hello world");
})

app.listen(process.env.port || 3000, function(){
    console.log("server has started");
})