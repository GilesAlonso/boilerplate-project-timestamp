const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not defined!');
  process.exit(1);
}

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Schemas
const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: String,
  duration: Number,
  date: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Homepage Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// User Routes
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

// Exercise Routes
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const formattedDate = date ? new Date(date).toDateString() : new Date().toDateString();

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: parseInt(duration),
      date: formattedDate
    });

    const savedExercise = await newExercise.save();
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date,
      _id: user._id
    });
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    let query = { userId: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from).toDateString();
      if (to) query.date.$lte = new Date(to).toDateString();
    }

    let exercises = await Exercise.find(query).select('description duration date');
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
    res.status(500).send('Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
