// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');

// Initialize app
const app = express();

// Middleware
app.use(express.json());

// MongoDB Connection
const mongoUri = process.env.MONGO_URI; // Mongo URI from environment variable
if (!mongoUri) {
  console.error('MONGO_URI is not defined!');
  process.exit(1); // Exit if MongoDB URI is not provided
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });

// MongoDB Schema for URL shortener
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});

const Url = mongoose.model('Url', urlSchema);



// Whoami API Route
app.get("/api/whoami", (req, res) => {
  const ipaddress = req.ip;
  const language = req.get('Accept-Language');
  const software = req.get('User-Agent');

  res.json({
    ipaddress,
    language,
    software
  });
});

// URL Shortener Routes
app.post('/api/shorturl', (req, res) => {
  const { original_url } = req.body;

  // Check if the URL is valid
  if (!validUrl.isWebUri(original_url)) {
    return res.json({ error: 'invalid url' });
  }

  // Generate a unique short URL
  const shortUrl = shortid.generate();

  // Save to MongoDB
  const newUrl = new Url({
    original_url,
    short_url: shortUrl
  });

  newUrl.save()
    .then(() => {
      res.json({
        original_url,
        short_url: shortUrl
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Server Error');
    });
});

app.get('/api/shorturl/:shorturl', (req, res) => {
  const { shorturl } = req.params;

  // Find the corresponding URL in the database
  Url.findOne({ short_url: shorturl })
    .then(url => {
      if (!url) {
        return res.status(404).json({ error: 'No URL found for this short URL' });
      }

      // Redirect to the original URL
      res.redirect(url.original_url);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Server Error');
    });
});


// Timestamp Microservice Routes
app.get("/api/hello", (req, res) => {
  res.json({ greeting: 'hello API' });
});

app.get("/api/:date?", (req, res) => {
  const dateString = req.params.date || ''; // If no date provided, use current date
  const date = dateString ? new Date(dateString) : new Date();

  if (isNaN(date.getTime())) {
    return res.json({ error: 'Invalid Date' });
  }

  res.json({
    unix: date.getTime(),
    utc: date.toUTCString()
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
