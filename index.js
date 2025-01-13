// index.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
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
