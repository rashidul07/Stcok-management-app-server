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
    const historyCollection = database.collection("history")
    const stockHistoryCollection = database.collection("stockHistory")

    //get all product from DB ** working
    app.get("/getProducts", async (req, res) => {
      //get params from url
      const type = req.query?.type
      if (type === 'product') {
        const result = await collection.find({}).sort({ "company": 1 }).toArray()
        res.send(result)
      } else if (type === 'stock') {
        const result = await stockCollection.find({}).sort({ "company": 1 }).toArray()
        res.send(result)
      }
    })

    //add products to DB ** working
    app.post('/addProducts', async (req, res) => {
      const products = req.body.productsCollection
      const type = req.query?.type

      let modifiedCount = 0;
      let insertedCount = 0;

      for (const pd of products) {
        const filter = { _id: ObjectId(pd._id) };
        const options = { upsert: true };
        if (pd.hasOwnProperty('_id')) {
          delete pd._id;
        }
        const update = { $set: pd }

        let result;
        if (type === 'product') {
          result = await collection.updateOne(filter, update, options);
          if (result.upsertedCount > 0) {
            insertedCount++;
            const history = {
              productId: result.upsertedId,
              label: pd.label,
              date: new Date().toISOString(),
              user: req.query.user,
              operation: 'insert',
              rId: pd.rId,
              productData: pd
            }       
            await historyCollection.insertOne(history)

          } else if (result.modifiedCount > 0) {
            modifiedCount++;
          }
        } else if (type === 'stock') {
          result = await stockCollection.updateOne(filter, update, options);
          if (result.upsertedCount > 0) {
            insertedCount++;
            const history = {
              productId: result.upsertedId,
              label: pd.label,
              date: new Date().toISOString(),
              user: req.query.user,
              operation: 'insert',
              rId: pd.rId,
              productData: pd
            }       
            await stockHistoryCollection.insertOne(history)
            
          } else if (result.modifiedCount > 0) {
            modifiedCount++;
          }
        }
      }
      res.send({ modifiedCount, insertedCount });
    })

    //delete many product ** working
    app.delete('/deleteProducts', async (req, res) => {
      const query = req.body
      const type = req.query?.type
      const data = query.map(pd => {
        return ObjectId(pd._id)
      })
      let result;
      let deletedCount = 0;
      if (type === 'product') {
        for(const pd of query){
          const history = {
            productId: pd._id,
            label: pd.label,
            date: new Date().toISOString(),
            user: req.query.user,
            operation: 'delete',
            rId: pd.rId,
            productData: pd
          }
          result = await collection.findOneAndDelete({_id: ObjectId(pd._id)});
          if(result.ok === 1){
            deletedCount++;
              await historyCollection.insertOne(history)
          }
        }
      } else if (type === 'stock') {
        for(const pd of query){
          const history = {
            productId: pd._id,
            label: pd.label,
            date: new Date().toISOString(),
            user: req.query.user,
            operation: 'delete',
            rId: pd.rId,
            productData: pd
          }
          result = await stockCollection.findOneAndDelete({_id: ObjectId(pd._id)});
          if(result.ok === 1){
            deletedCount++;
            await stockHistoryCollection.insertOne(history)
          }
        }
      }
      res.send({ deletedCount })
    })

    //add a history to DB ** working
    app.post('/addHistory', async (req, res) => {
      const history = req.body
      await historyCollection.insertMany(history)
    })

    //add a history to DB ** working
    app.post('/addStockHistory', async (req, res) => {
      const history = req.body
      await stockHistoryCollection.insertMany(history)
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


