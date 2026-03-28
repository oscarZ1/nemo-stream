import express from "express"; 

const app = express(); 
const port = 3000; 
const apiKey = process.env.API_KEY; 

app.use(express.json()); 


app.get("/", (req, res) => {
    res.json("hello"); 
})

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})

