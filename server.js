const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const collectionName = 'items';

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

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

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

const stealSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  quantity: { type: Number, default: 1 }
});

const Item = mongoose.model('Item', itemSchema, collectionName);
const Cart = mongoose.model('Cart', cartSchema, 'carts');
const Steal = mongoose.model('Steal', stealSchema, 'steal');

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
    const items = await Item.find();
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items.' });
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    const cartItems = await Cart.find().populate('itemId').exec();
    console.log('Fetched cart items:', cartItems);
    res.status(200).json(cartItems);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Failed to fetch cart items.' });
  }
});

app.post('/api/cart', async (req, res) => {
  const { itemId, quantityChange = 1 } = req.body;

  try {
    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({ error: `Item with ID ${itemId} does not exist.` });
    }

    const cartItem = await Cart.findOne({ itemId: new ObjectId(itemId) });

    if (cartItem) {
      cartItem.quantity += quantityChange;

      if (cartItem.quantity <= 0) {
        await Cart.deleteOne({ _id: cartItem._id });
        res.status(200).json({ message: 'Item removed from cart.' });
      } else {
        await cartItem.save();
        res.status(200).json(cartItem);
      }
    } else if (quantityChange > 0) {
      const newCartItem = new Cart({ itemId: new ObjectId(itemId), quantity: quantityChange });
      await newCartItem.save();
      res.status(200).json(newCartItem);
    } else {
      res.status(400).json({ error: 'Cannot decrement non-existent item.' });
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart.' });
  }
});

app.post('/api/steal', async (req, res) => {
  try {
      // Fetch all items from the cart
      const cartItems = await Cart.find();

      if (cartItems.length === 0) {
          return res.status(404).json({ message: 'No items in cart to transfer.' });
      }

      // Transfer items from the cart to the steal collection
      const transferPromises = cartItems.map(async cartItem => {
          const { itemId, quantity } = cartItem;

          try {
              // Transfer the item to the steal collection
              await Steal.create({ itemId, quantity });

              // Remove the item from the cart
              await Cart.deleteOne({ _id: cartItem._id });
          } catch (err) {
              console.error('Error transferring item to steal collection:', err);
              throw new Error('Failed to transfer some items.');
          }
      });

      // Wait for all transfers to complete
      await Promise.all(transferPromises);

      res.status(200).json({ message: 'Items transferred to steal collection successfully.' });
  } catch (error) {
      console.error('Error transferring items:', error);
      res.status(500).json({ error: 'Failed to transfer items.' });
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

app.post('/delete', async (req, res) => {
  const { itemId } = req.body;

  try {
    const deleteQuery = { itemId: new ObjectId(itemId) };
    const result = await Cart.deleteOne(deleteQuery);

    if (result.deletedCount > 0) {
      console.log('Document deleted successfully.');
      res.status(200).json({ message: 'Document deleted successfully!' });
    } else {
      console.log('No document found with the provided itemId.');
      res.status(404).json({ error: 'No document found with the provided itemId.' });
    }
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'An error occurred while deleting the document.' });
  }
});

app.delete('/api/cart/:itemId', async (req, res) => {
  const itemId = req.params.itemId;

  try {
    const result = await Cart.deleteOne({ _id: new ObjectId(itemId) });

    if (result.deletedCount > 0) {
      res.status(200).json({ message: 'Item deleted successfully!' });
    } else {
      res.status(404).json({ error: 'No item found with the provided itemId.' });
    }
  } catch (err) {
    console.error('Error deleting item:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});