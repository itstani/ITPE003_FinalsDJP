const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Shop');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.post('/add-item', (req, res) => {
  const item = req.body;
  const newItem = new mongoose.model('items')(item);
  newItem.save().then(() => {
    res.json({ message: 'Item added to cart successfully' });
  }).catch(err => {
    console.error(err);
    res.status(500).send({ message: 'Error adding item to cart' });
  });
});

app.post('/update-item-quantity', (req, res) => {
  const itemId = req.body.itemId;
  const filter = { _id: mongoose.Types.ObjectId(itemId) };
  const update = { $inc: { itmqty: -1 } };

  mongoose.model('items').updateOne(filter, update, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false });
    } else {
      res.send({ success: true });
    }
  });
});


const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});