const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

app.get('/api/query', (req, res)=>{

})

app.listen(PORT, ()=>{
    console.log('Server is listning');
})

