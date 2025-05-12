const express = require('express');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const fs = require('fs');

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(fileUpload());

const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || "secret123";

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

app.post('/upload', (req, res) => {
  const { password } = req.body;
  if (password !== UPLOAD_PASSWORD) return res.status(403).send('Invalid password');
  if (!req.files || !req.files.file) return res.status(400).send('No file uploaded');

  const file = req.files.file;
  const uploadPath = path.join(__dirname, 'knowledge', file.name);
  file.mv(uploadPath, err => {
    if (err) return res.status(500).send(err);
    res.send('File uploaded successfully');
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: message }]
    });
    res.json({ reply: chatResponse.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Error connecting to OpenAI.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
