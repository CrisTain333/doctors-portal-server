 const express = require('express');
 const app = express();
 const jwt =  require('jsonwebtoken')
 const {MongoClient,ObjectId} = require('mongodb');
 const PORT = 5000
 const cors = require("cors");

 app.use(cors());
 app.use(express.json());
 require("dotenv").config();

 app.get('/',(req,res)=>{
    res.send('App On Fire');
 })

 app.listen(PORT,()=>{
    console.log(`App Running On Port ${PORT} `)
 })