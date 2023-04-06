const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const cors = require("cors")
const ObjectId = require('mongodb').ObjectId
require('dotenv').config()

const port = process.env.PORT || 5000;
const whitelist = ["https://rafimeds.web.app"]
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
}
//remove cors for development
app.use(cors(corsOptions))
// app.use(cors({
//   origin: 'http://localhost:5173',
// }));
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wbvsa.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const run = async () => {
  try {
    await client.connect()
    const database = client.db(process.env.DB_NAME)
    const collection = database.collection("products")
    const stockCollection = database.collection("stockProducts")

    //get all product from DB ** working
    app.get("/products", async (req, res) => {
      const result = await collection.find({}).sort({ "company": 1 }).toArray()
      res.send(result)
    })

    //add products to DB ** working
    app.post('/addProducts', async (req, res) => {
      const products = req.body.productsCollection
     
      let modifiedCount = 0;
      let insertedCount = 0;
      
      for (const pd of products) {
        const filter = { _id: ObjectId(pd._id) };
        const options = { upsert: true };
        if (pd.hasOwnProperty('_id')) {
          delete pd._id;
        }
        const update = { $set: pd }
        const result = await collection.updateOne(filter, update, options);
        
        if (result.upsertedCount > 0) {
          insertedCount++;
        } else if (result.modifiedCount > 0) {
          modifiedCount++;
        }
      }
      res.send({ modifiedCount, insertedCount });
    })

       //delete many product ** need to change the url && working
       app.delete('/product', async (req, res) => {
        const query = req.body
        const data = query.map(pd => {
          return ObjectId(pd._id)
        })
  
        const result = await collection.deleteMany({ _id: { $in: data } })
        res.send(result)
      })
  
  
      //update many items ** need to change the url && working
      app.put('/update', async (req, res) => {
        const query = req.body
  
        const data = query.map(pd => {
          return {
            updateOne: {
              filter: { _id: ObjectId(pd._id) },
              update: { $set: { status: pd.status } }
            }
          }
        })
  
        const result = await collection.bulkWrite(data)
        res.send(result)
  
      })

    //delete a product ** i think did't need this
    app.delete('/product/:id', async (req, res) => {
      const query = req.params.id
      const id = { _id: ObjectId(query) }
      const result = await collection.deleteOne(id)
      res.send(result)
    })

     //update status ** i think did't need this
     app.put('/product/:id', async (req, res) => {
      const params = req.params.id
      const query = req.query.status

      const id = { _id: ObjectId(params) }
      const updateDoc = {
        $set: {
          status: query
        },
      };
      const result = await collection.updateOne(id, updateDoc)
      res.send(result)
    })

    //update quantity status ** i think did't need this
    app.put('/productQuantity/:id', async (req, res) => {
      const params = req.params.id
      const query = req.query.quantity
      const id = { _id: ObjectId(params) }
      const updateDoc = {
        $set: {
          quantity: query
        },
      };
      const result = await collection.updateOne(id, updateDoc)
      res.send(result)
    })

    //update product info ** i think did't need this
    app.put('/productUpdate', async (req, res) => {
      const pd = req.body
      const productId = pd._id
      const id = { _id: ObjectId(productId) }
      const updateDoc = {
        $set: {
          name: pd.name,
          label: pd.label,
          quantity: pd.quantity,
          company: pd.company,
          updated_at: pd.updated_at,
          updated_by: pd.updated_by
        },
      };
      const result = await collection.updateOne(id, updateDoc)
      res.send(result)
    })

    //find by company name ** i think did't need this
    app.get('/products/:company', async (req, res) => {
      const query = req.params.company
      const company = { company: (query) }
      const result = await collection.find(company).sort({ "name": 1 }).toArray()
      res.send(result)

    })

    /*------- all stock product api --------*/

    //get all Stock product from DB ** working
    app.get("/stockProducts", async (req, res) => {
      const result = await stockCollection.find({}).sort({ "company": 1 }).toArray()
        res.send(result)
    })

    //add many stockProducts ** working
    app.post('/addStockProduct', async (req, res) => {
      const products = req.body.productsCollection
      let modifiedCount = 0;
      let insertedCount = 0;
      
      for (const pd of products) {
        const filter = { _id: ObjectId(pd._id) };
        const options = { upsert: true };
        if (pd.hasOwnProperty('_id')) {
          delete pd._id;
        }
        const update = { $set: pd }
        const result = await stockCollection.updateOne(filter, update, options);
        
        if (result.upsertedCount > 0) {
          insertedCount++;
        } else if (result.modifiedCount > 0) {
          modifiedCount++;
        }
      }
      res.send({ modifiedCount, insertedCount });
    })

  } catch (error) {
    console.log(error);
    process.exit(1)
  }
}

run().then(() => {
  console.log("Database connected");
  app.listen(port, () => {
    console.log("Listening from port", port)

  })
})

app.get('/', (req, res) => {
  res.send("Welcome to Rafi Medicine center shortlist server")
})


