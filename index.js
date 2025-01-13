// index.js
// where your node app starts

// init project
var express = require('express');
var app = express();
const validUrl = require('valid-url');
const shortid = require('shortid');

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// Middleware
app.use(express.json());

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

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


// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
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

// /api/whoami endpoint
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


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

// Debugging log
app.use((req, res, next) => {
  console.log(`Received request for ${req.method} ${req.url}`);
  next();
});

// API endpoint to handle date requests
app.get("/api/:date?", function (req, res) {
  let dateParam = req.params.date;

  let date;

  // If no date is provided, use the current date
  if (!dateParam) {
    date = new Date();
  } else {
    // Check if dateParam is a number (Unix timestamp in milliseconds)
    if (!isNaN(dateParam)) {
      date = new Date(parseInt(dateParam));
    } else {
      date = new Date(dateParam);
    }
  }

  // Validate the date
  if (date.toString() === "Invalid Date") {
    res.json({ error: "Invalid Date" });
  } else {
    res.json({
      unix: date.getTime(),
      utc: date.toUTCString()
    });
  }
});





// Listen on port set in environment variable or default to 3000
var listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
