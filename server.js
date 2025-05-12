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
const KNOWLEDGE_FOLDER = path.join(__dirname, 'knowledge');

// Serve upload page
app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Handle file uploads
app.post('/upload', (req, res) => {
  const { password } = req.body;
  if (password !== UPLOAD_PASSWORD) return res.status(403).send('Invalid password');
  if (!req.files || !req.files.file) return res.status(400).send('No file uploaded');

  const file = req.files.file;
  const uploadPath = path.join(KNOWLEDGE_FOLDER, file.name);
  file.mv(uploadPath, err => {
    if (err) return res.status(500).send(err);
    res.send('File uploaded successfully');
  });
});

// Handle chat requests
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    // Gather all .txt knowledge files
    const files = fs.readdirSync(KNOWLEDGE_FOLDER).filter(file => file.endsWith('.txt'));
    let combinedKnowledge = '';

    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_FOLDER, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      combinedKnowledge += `\n--- ${file} ---\n${content}\n`;
    }

    const messages = [
      {
        role: 'system',
        content: combinedKnowledge
          ? `You are a helpful assistant with access to the following uploaded knowledge:\n${combinedKnowledge}`
          : `You are a helpful assistant. No uploaded knowledge is currently available.`,
      },
      {
        role: 'user',
        content: message,
      }
    ];

    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages
    });

    res.json({ reply: chatResponse.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Error connecting to OpenAI.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

