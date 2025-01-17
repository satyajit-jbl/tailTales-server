const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zh93j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const petCollection = client.db("TailTales").collection("pets");
    const userCollection = client.db("TailTales").collection("users");

    //users related api
    app.post('/users', async (req, res)=>{
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    //pets collection

    app.get('/pets', async(req, res)=>{
        const result = await petCollection.find().toArray()
        res.send(result);
    })

    // get pet my email(for my added pet page)

    app.get('/pets/users/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email : email};
      const result = await petCollection.find(query).toArray();
      res.send(result);

    })
    
    // app.get('/pets/:id', async(req, res)=>{
    //   const id = req.params.id;
    //   const query = {_id : new ObjectId(id)};
    //   const result = await petCollection.find(query).toArray();
    //   res.send(result);
    // })

    // get pet by id
    app.get('/pets/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await petCollection.findOne(query);
      // const result = await petCollection.findOne(query).toArray();
      res.send(result);
    })


    
    app.post('/pets', async (req, res)=>{
        const petList = req.body;
        const result = await petCollection.insertOne(petList);
        res.send(result);
      })

    app.delete('/pets/:id', async(req, res)=>{
      const id = req.params.id;
      const query= {_id : new ObjectId(id)};
      const result= await petCollection.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('TailTales is runing')
})

app.listen(port,()=>{
    console.log(`TailTales is running on port ${port}`);
})