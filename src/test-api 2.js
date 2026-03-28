import fs from 'fs';

// 1. Read the local image and convert it to a base64 string
// Make sure this matches the actual name of the image file you dropped in the folder
const imageBase64 = fs.readFileSync('./test.png', 'base64'); 

const payload = {
  imageBase64: imageBase64,
  currentTask: "writing code for a hackathon"
};

console.log("Sending request to Express server...");

// 2. Fire the request to your local server
fetch('http://localhost:3000/api/stream-state', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => response.json())
  .then(data => {
    console.log("✅ SUCCESS! Here is the AI's response:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(error => {
    console.error("❌ ERROR:", error);
  });