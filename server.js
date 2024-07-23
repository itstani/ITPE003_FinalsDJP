const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const collectionName = 'items'; 

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/Shop')
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

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Define item schema and model
const itemSchema = new mongoose.Schema({
  itmn: String,
  itmp: String,
  itmqty: Number,
  imageUrl: String,
  inInventory: Boolean
});

const cartSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  quantity: { type: Number, default: 1 }
});

const Item = mongoose.model('Item', itemSchema, collectionName);
const Cart = mongoose.model('Cart', cartSchema);

app.get('/', (req, res) => {
  console.log('Serving main.html');
  res.sendFile(path.join(__dirname, 'main.html'));
});

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

app.post('/update-inventory', async (req, res) => {
  const { itemId, newQuantity } = req.body;
  try {
    const filter = { _id: new ObjectId(itemId) };
    const update = { $set: { itmqty: newQuantity } };
    const result = await Item.updateOne(filter, update);

    if (result.matchedCount > 0) {
      console.log('Inventory updated successfully.');
      res.status(200).json({ message: 'Inventory updated successfully!' });
    } else {
      console.log('No item found with the provided ID.');
      res.status(404).json({ error: 'No item found with the provided ID.' });
    }
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ error: 'Failed to update inventory.' });
  }
});

app.get('/api/inventory-items', async (req, res) => {
  try {
    const items = await Item.find(); // Ensure this includes updated quantities if items are in the cart
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items.' });
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    const cartItems = await Cart.find().populate('itemId').exec();
    console.log('Fetched cart items:', cartItems); // Debugging
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Failed to fetch cart items.' });
  }
});

app.post('/api/cart', async (req, res) => {
  const { itemId, quantity } = req.body;
  try {
    const cartItem = await Cart.findOneAndUpdate(
      { itemId: itemId },
      { quantity: quantity },
      { upsert: true, new: true }
    );
    res.status(200).json(cartItem);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

app.post('/api/steal', async (req, res) => {
  const quantities = req.body;
  try {
    for (const [itemId, quantity] of Object.entries(quantities)) {
      await Item.updateOne(
        { _id: new ObjectId(itemId) },
        { $inc: { itmqty: -quantity } }
      );
    }
    res.status(200).json({ message: 'Quantities subtracted successfully.' });
  } catch (error) {
    console.error('Error subtracting quantities:', error);
    res.status(500).json({ error: 'Failed to subtract quantities.' });
  }
});

app.post('/api/finalize-quantity', async (req, res) => {
  const { itemId, quantity } = req.body;
  try {
    await Cart.findOneAndUpdate(
      { itemId: itemId },
      { quantity: quantity },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: 'Quantity finalized successfully.' });
  } catch (error) {
    console.error('Error finalizing quantity:', error);
    res.status(500).json({ error: 'Failed to finalize quantity.' });
  }
});
