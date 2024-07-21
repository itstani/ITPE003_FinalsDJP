    const express = require('express');
    const { MongoClient, ObjectId } = require('mongodb');
    const path = require('path');
    const cors = require('cors');
    const mongoose = require('mongoose');

    const app = express();
    const port = 3000;
    const collectionName = "items";

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
      itemId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
    });
    const CartItem = mongoose.model('CartItem', cartSchema);
    

    const Item = mongoose.model('Item', itemSchema, collectionName);

    // Routes
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
    
      // Check if itemId is provided
      if (!itemId) {
          return res.status(400).json({ message: 'Item ID is required' });
      }
    
      try {
          const filter = { _id: new ObjectId(itemId) };
          const item = await Item.findOne(filter);
          
          if (item) {
              // Decrement quantity and set inInventory flag
              if (item.itmqty > 0) {
                  await Item.updateOne(filter, { 
                    $inc: { itmqty: -1 },
                    $set: { inInventory: true }
                  });
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
      // Update the cart (this example assumes you have a Cart model)
      const item = await Item.findById(itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      // Update the inInventory field based on the new quantity
      item.itmqty = quantity;
      item.inInventory = quantity > 0;
      await item.save();

      res.status(200).json({ message: 'Cart updated', item });
  } catch (err) {
      console.error('Error updating cart:', err);
      res.status(500).json({ error: 'An error occurred while updating the cart' });
  }
});


// Get items in the cart
app.get('/api/cart-items', async (req, res) => {
  try {
    const cartItems = await CartItem.find().populate('itemId');
    res.status(200).json(cartItems);
  } catch (err) {
    console.error('Error fetching cart items:', err);
    res.status(500).json({ message: 'Error fetching cart items' });
  }
});

// Remove item from the cart
app.delete('/api/cart/:itemId', async (req, res) => {
  const { itemId } = req.params;

  try {
    await CartItem.deleteOne({ itemId });
    res.status(200).json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Error removing item from cart:', err);
    res.status(500).json({ message: 'Error removing item from cart' });
  }
});
