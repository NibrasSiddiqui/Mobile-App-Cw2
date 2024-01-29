const express = require('express');
const { MongoClient } = require('mongodb');
const propertiesReader = require('properties-reader');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

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

// Orders Api
app.get('/orders', async (req, res) => {

  console.log("Start from here")
  const orderInfo = req.body;
  const Orders = db.collection("orders");
  // Create a new document                                                                                                                                           
  let OrderDoc = {
    "name": orderInfo.name,
    "lessonIds": orderInfo.lessonIds,                                                                                        
    "phoneNumber": orderInfo.phoneNumber,                                                                                                                               
    "spaces": orderInfo.spaces

}
// Insert the document into the specified collection        
    await Orders.insertOne(OrderDoc);
    res.status(201);
    console.log("It ends here")
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
