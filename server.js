const express = require('express');
const { MongoClient } = require('mongodb');
const propertiesReader = require('properties-reader');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

const lessonIdsArray = {};

const port = process.env.PORT || 3000;

// Load database properties from db.properties file
const propertiesPath = path.resolve(__dirname, 'conf', 'db.properties');
const properties = propertiesReader(propertiesPath);

// Construct MongoDB connection URI
const dbPrefix = properties.get('db.prefix');
const dbUsername = encodeURIComponent(properties.get('db.user'));
const dbPwd = encodeURIComponent(properties.get('db.pwd'));
const dbName = properties.get('db.dbName');
const dbUrl = properties.get('db.dbUrl');
const dbParams = properties.get('db.params');

const uri = `${dbPrefix}${dbUsername}:${dbPwd}${dbUrl}${dbParams}`;

// Create a new MongoClient
const client = new MongoClient(uri);

// Connect to the MongoDB database
client.connect();

const db = client.db(dbName);

app.use(express.json());
app.set("json spaces", 3);
app.use(cors());
app.use(morgan("short"));

app.get('/products', async (req, res) => {
  try {
    const Products = db.collection("products");
    const productsData = await Products.find({}).toArray();
    res.json(productsData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/', async (req, res) => {
  res.send("Welcome To The Website");
});

// GET /search Endpoint for searching lessons
app.get('/search', async (req, res) => {
  try {
    const searchTerm = req.query.q; // Get the search query from the request query parameters
    const Products = db.collection("products");

    // Perform a case-insensitive search on both title and location
    const searchResults = await Products.find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { location: { $regex: searchTerm, $options: 'i' } }
      ]
    }).toArray();

    res.json(searchResults);
  } catch (error) {
    console.error("Error searching lessons:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Orders Api
app.post('/orders', async (req, res) => {
  console.log("Start from here");
  const orderInfo = req.body;
  const Orders = db.collection("orders");

  // Create a new document
  let OrderDoc = {
    "name": orderInfo.name,
    "lessonIds": orderInfo.lessonIds,
    "phoneNumber": orderInfo.phoneNumber,
    "spaces": orderInfo.spaces
  }

  lessonIdsArray = orderInfo.lessonIds;

  // Insert the document into the specified collection
  await Orders.insertOne(OrderDoc);
  res.status(201);
  console.log("It ends here");
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

app.put("/update", async (req, res) => {
  try {
    const Products = db.collection("products");

    // Loop through lessonIdsArray to count occurrences
    const counts = {};
    lessonIdsArray.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });

    // Update availableInventory based on the counts
    for (const id in counts) {
      const count = counts[id];

      // Find the product with the given lesson ID
      const product = await Products.findOne({ lessonId: id });

      if (product) {
        // Update availableInventory by subtracting the original value multiplied by the count
        const updatedInventory = product.availableInventory - (product.originalInventory * count);

        // Update the product in the database
        await Products.updateOne({ lessonId: id }, { $set: { availableInventory: updatedInventory } });
      }
    }

    res.status(200).json({ message: "Inventory updated successfully" });
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
