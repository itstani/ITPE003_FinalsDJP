const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

const url = 'mongodb://localhost:27017';
const dbName = 'Shop';
const collectionName = 'items';

// Connect to MongoDB using Mongoose
mongoose.connect(url, { dbName })
  .then(() => {
    console.log('Connected to MongoDB');

    app.listen(port, () => {
      console.log(`Server is up and running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  console.log('Serving main.html');
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Define the Mongoose schema and model for the items
const itemSchema = new mongoose.Schema({
  _id: ObjectId,
  name: String,
  category: String,
  quantity: Number,
});

const Item = mongoose.model('Item', itemSchema, collectionName);

// Insert new item
app.post('/submit-form', async (req, res) => {
  try {
    const formData = req.body;
    console.log('Received form data:', formData);
    const result = await Item.create(formData);
    console.log('Data inserted successfully:', result);
    res.send({ message: 'Form submitted successfully' });
  } catch (err) {
    console.error('Error inserting data:', err);
    res.status(500).send({ message: `Error inserting data: ${err.message}` });
  }
});

app.post('/add-to-cart', async (req, res) => {
  const { itemId } = req.body;
  try {
    const filter = { _id: new ObjectId(itemId) };
    const update = { $inc: { itmqty: -1 } }; // Assuming `itmqty` is the field for item quantity
    const result = await collection.updateOne(filter, update);

    if (result.matchedCount > 0) {
      console.log(`Item with ID ${itemId} updated successfully`);
      res.json({ message: 'Item added to inventory successfully' });
    } else {
      console.log(`No item found with ID ${itemId}`);
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ message: `Error updating item: ${err.message}` });
  }
});

// Fetch all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find({});
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ message: `Error fetching items: ${err.message}` });
  }
});

// Search for an item by ID
app.get('/search', async (req, res) => {
  const { itemId } = req.query;
  try {
    const item = await Item.findOne({ _id: new ObjectId(itemId) });
    if (item) {
      console.log('Item found:', item);
      res.status(200).json(item);
    } else {
      console.log('No item found with the provided ID.');
      res.status(404).json({ error: 'No item found with the provided ID.' });
    }
  } catch (err) {
    console.error('Error searching for item:', err);
    res.status(500).json({ error: 'An error occurred while searching for the item.' });
  }
});

// Update item details
app.post('/update', async (req, res) => {
  const { itemId, ...updateData } = req.body;
  try {
    const filter = { _id: new ObjectId(itemId) };
    const update = { $set: updateData };
    const result = await Item.updateOne(filter, update);

    if (result.matchedCount > 0) {
      console.log('Item updated successfully.');
      res.status(200).json({ message: 'Item updated successfully!' });
    } else {
      console.log('No item found with the provided ID.');
      res.status(404).json({ error: 'No item found with the provided ID.' });
    }
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'An error occurred while updating the item.' });
  }
});

// Delete item
app.post('/delete', async (req, res) => {
  const { itemId } = req.body;
  try {
    const filter = { _id: new ObjectId(itemId) };
    const result = await Item.deleteOne(filter);

    if (result.deletedCount > 0) {
      console.log('Item deleted successfully.');
      res.status(200).json({ message: 'Item deleted successfully!' });
    } else {
      console.log('No item found with the provided ID.');
      res.status(404).json({ error: 'No item found with the provided ID.' });
    }
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'An error occurred while deleting the item.' });
  }
});