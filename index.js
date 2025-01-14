// Importing required modules
const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');
const path = require('path');

// Initialize the Express application
const app = express();

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not defined!');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schema for URL shortener
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String
});

const Url = mongoose.model('Url', urlSchema);

// MongoDB Schema for User (added to handle user-related routes)
const userSchema = new mongoose.Schema({
  username: String
});

const User = mongoose.model('User', userSchema);

// MongoDB Schema for Exercise
const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

// Homepage Route
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'views', 'index.html')); // Serve index.html from views folder
});

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
  const { url } = req.body; // The form field name is 'url'

  // Check if the URL is valid
  if (!validUrl.isWebUri(url)) {
    return res.json({ error: 'invalid url' });
  }

  // Generate a unique short URL
  const shortUrl = shortid.generate();

  // Save to MongoDB
  const newUrl = new Url({
    original_url: url,
    short_url: shortUrl
  });

  newUrl.save()
    .then(() => {
      res.json({
        original_url: url,
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

// Log Exercise Routes (For Logging Exercises with Date Filtering)
app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    let query = { username: user.username };

    // If 'from' or 'to' query parameters are provided, handle date comparison
    if (from || to) {
      query.date = {};

      // Convert 'from' and 'to' to Date objects
      if (from) {
        const fromDate = new Date(from);
        query.date.$gte = fromDate.toDateString(); // Store the date as a string
      }

      if (to) {
        const toDate = new Date(to);
        query.date.$lte = toDate.toDateString(); // Store the date as a string
      }
    }

    // Fetch exercises based on the query
    let exercises = await Exercise.find(query).select('description duration date');

    // Apply limit if present
    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date
      }))
    });
  } catch (error) {
    console.error('Error fetching logs:', error); // Debugging output
    res.status(500).send('Server Error');
  }
});

// Function to add an exercise log
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  // Handle date if provided or set current date
  const exerciseDate = date || new Date().toISOString();

  const newExercise = new Exercise({
    username: _id,
    description,
    duration,
    date: exerciseDate
  });

  newExercise.save()
    .then(exercise => {
      res.json({
        username: exercise.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date,
        _id: _id
      });
    })
    .catch(err => {
      console.error('Error saving exercise:', err);
      res.status(500).send('Server Error');
    });
});

// Timestamp Microservice Routes
app.get("/api/hello", (req, res) => {
  res.json({ greeting: 'hello API' });
});

app.get("/api/:date?", (req, res) => {
  const dateString = req.params.date || '';
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
  console.log(`Server running on port ${PORT}`);
});
