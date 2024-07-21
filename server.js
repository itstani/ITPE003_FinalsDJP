const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const collectionName = 'items'; 

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Shop')
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
    res.status(500).json({ error: 'An error occurred while updating the inventory.' });
  }
});

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

app.post('/add-to-cart', async (req, res) => {
  const { itemId } = req.body;

  if (!itemId) {
    return res.status(400).json({ message: 'Item ID is required' });
  }

  try {
    const filter = { _id: new ObjectId(itemId) };
    const item = await Item.findOne(filter);

    if (item) {
      if (item.itmqty > 0) {
        await Item.updateOne(filter, { $inc: { itmqty: -1 }, $set: { inInventory: true } });
        res.json({ message: 'Item added to inventory successfully' });
      } else {
        res.status(400).json({ message: 'Item quantity is zero' });
      }
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ message: `Error updating item: ${err.message}` });
  }
});

  app.get('/api/inventory-items', async (req, res) => {
    try {
      const items = await Item.find({ inInventory: true });
      res.status(200).json(items);
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      res.status(500).json({ message: 'Error fetching inventory items' });
    }
  });
  
  app.post('/api/cart', async (req, res) => {
    const { itemId, quantity } = req.body;
  
    if (quantity < 0) return res.status(400).json({ error: 'Invalid quantity' });
  
    try {
      const item = await Item.findById(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
  
      const cartItem = await Cart.findOne({ itemId });
      if (cartItem) {
        cartItem.quantity = quantity;
        await cartItem.save();
      } else {
        const newCartItem = new Cart({ itemId, quantity });
        await newCartItem.save();
      }
  
      res.status(200).json({ message: 'Cart updated' });
    } catch (err) {
      console.error('Error updating cart:', err);
      res.status(500).json({ error: 'An error occurred while updating the cart' });
    }
  });
  
  app.get('/api/cart-items', async (req, res) => {
    try {
      const cartItems = await Cart.find().populate('itemId');
      res.status(200).json(cartItems);
    } catch (err) {
      console.error('Error fetching cart items:', err);
      res.status(500).json({ message: 'Error fetching cart items' });
    }
  });
  
  app.delete('/api/cart/:itemId', async (req, res) => {
    const { itemId } = req.params;
  
    try {
      await Cart.deleteOne({ itemId });
      res.status(200).json({ message: 'Item removed from cart' });
    } catch (err) {
      console.error('Error removing item from cart:', err);
      res.status(500).json({ message: 'Error removing item from cart' });
    }
  });
  
  app.post('/api/finalize-quantity', async (req, res) => {
    const { itemId, quantity } = req.body;
  
    if (quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1' });
  
    try {
      const item = await Item.findById(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
  
      item.itmqty = quantity;
      item.inInventory = quantity > 0;
      await item.save();
  
      res.status(200).json({ message: 'Quantity finalized', item });
    } catch (err) {
      console.error('Error finalizing quantity:', err);
      res.status(500).json({ error: 'An error occurred while finalizing the quantity' });
    }
  });
  
  app.post('/api/steal', async (req, res) => {
    try {
      const cartItems = await Cart.find().populate('itemId');
  
      let totalValue = 0;
      const itemsTaken = [];
  
      for (const cartItem of cartItems) {
        const item = cartItem.itemId;
        if (item) {
          totalValue += item.itmp * cartItem.quantity;
          itemsTaken.push({
            name: item.itmn,
            quantity: cartItem.quantity,
            price: item.itmp,
            total: item.itmp * cartItem.quantity
          });
        }
      }
  
      res.status(200).json({ totalValue, itemsTaken });
    } catch (err) {
      console.error('Error calculating stolen items:', err);
      res.status(500).json({ message: 'Error calculating stolen items' });
    }
  });