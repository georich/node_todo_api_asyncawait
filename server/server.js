require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middleware/authenticate');

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.post('/todos', authenticate, async (req, res) => {
  const todo = new Todo({
    text: req.body.text,
    _creator: req.user._id,
  });

  try {
    const doc = await todo.save();
    res.send(doc);
  } catch (e) {
    res.status(400).send(e);
  }
});

app.get('/todos', authenticate, async (req, res) => {
  try {
    const todos = await Todo.find({
      _creator: req.user._id
    });
    res.send({ todos });
  } catch (e) {
    res.status(400).send(e);
  }
});

app.get('/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  try {
    const todo = await Todo.findOne({
      _id: id,
      _creator: req.user._id
    });
    if (!todo) {
      return res.status(404).send();
    }
    res.send({ todo });
  } catch (e) {
    res.status(400).send();
  }
});

app.delete('/todos/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    }

    const todo = await Todo.findOneAndRemove({
      _id: id,
      _creator: req.user._id,
    });

    if (!todo) {
      return res.status(404).send();
    }

    res.send({ todo });
  } catch (e) {
    res.status(400).send();
  }
});

app.patch('/todos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  const body = {
    text,
    completed,
  };

  if (!ObjectID.isValid(id)) {
    return res.status(404).send();
  }

  if (typeof body.completed === 'boolean' && body.completed) {
    body.completedAt = new Date().getTime();
  } else {
    body.completed = false;
    body.completedAt = null;
  }

  try {
    const todo = await Todo.findOneAndUpdate({
      _id: id,
      _creator: req.user._id,
    }, { $set: body }, { new: true });
    if (!todo) {
      return res.status(404).send();
    }
    res.send({ todo });
  } catch (e) {
    res.status(400).send();
  }
});

app.post('/users', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = new User({ email, password });
    await user.save();
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (e) {
    res.status(400).send(e);
  }
});

app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user);
});

app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken();
    res.header('x-auth', token).send(user);
  } catch (e) {
    res.status(400).send();
  }
});

app.delete('/users/me/token', authenticate, async (req, res) => {
  try {
    await req.user.removeToken(req.token);
    res.status(200).send();
  } catch (e) {
    res.status(400).send();
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = {
  app,
};
