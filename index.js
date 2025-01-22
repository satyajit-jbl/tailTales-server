const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const donationCollection = client.db("TailTales").collection("donations");
    const adoptCollection = client.db("TailTales").collection("adopts");
    const donationAmountCollection = client.db("TailTales").collection("donationAmounts");

    //jwt related api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '5h'
      });
      res.send({token});
    })

    //middlewares
    const verifyToken = (req, res, next) =>{
      // console.log('inside verify token', req.headers);
      console.log('inside verify token', req.headers.authorization);
      if(!req.headers.authorization){
        return res.status(401).send({message: 'Unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'Unauthorized access'})
        }
        req.decoded = decoded;
       next()
      })
      // next();
    }

     // use verify admin after verifytOKEN
     const verifyAdmin = async (req, res, next)=>{
      const email = req.decoded.email;
      const query = {email : email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'});
      }
      next();
    }

    // donation amount related apis'

    // app.get('/donationAmt/users/:email', async(req, res)=>{
    //   const result = await donationAmountCollection.find().toArray();
    //   res.send(result);
    // })

  app.get('/donationAmt/users/:email', async(req, res)=>{
    const email = req.params.email;
    const query = {email: email};
    const result = await donationAmountCollection.find(query).toArray();
    res.send(result);
  })

  app.delete('/donationAmt/users/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await donationAmountCollection.deleteOne(query);
    res.send(result);

    // TODO Update the currentAmount in the corresponding donation campaign
  })

    // app.get('/donationAmount', async (req, res) => {
    //   const result = await donationAmountCollection.find().toArray()
    //   res.send(result);
    // })

    //users related api
    app.get('/users', verifyToken, verifyAdmin, async(req, res)=>{
    
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async(req, res)=>{
      const email = req.params.email;

      if(email != req.decoded.email){
        return res.status(403).send({message: 'Forbidden access'})
      }
      const query = {email : email};
      const user = await userCollection.findOne(query);
      let admin = false;
      if(user){
        admin = user?.role === 'admin'
        console.log(admin);
      }
      res.send({admin});
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updatedDoc = {
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //pets related apis'

    app.get('/pets', async (req, res) => {
      const result = await petCollection.find().sort({data:-1}).toArray()
      res.send(result);
    })

    // get pet my email(for my added pet page)

    app.get('/pets/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await petCollection.find(query).toArray();
      res.send(result);

    })

    // app.get('/pets/:id', async(req, res)=>{
    //   const id = req.params.id;
    //   const query = {_id : new ObjectId(id)};
    //   const result = await petCollection.find(query).toArray();
    //   res.send(result);
    // })

    // get pet by id (****** also using for update pet)
    app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.findOne(query);
      res.send(result);
    })



    app.post('/pets', async (req, res) => {
      const petList = req.body;
      const result = await petCollection.insertOne(petList);
      res.send(result);
    })

    app.delete('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petCollection.deleteOne(query);
      res.send(result);
    })

    // update pet as adopted
    app.patch('/pets/:id', async (req, res) => {
      const { id } = req.params;
      const update = { adopted: true };
      try {
        const result = await petCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: update }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to update pet status', error });
      }
    });

    app.patch('/pets/update/:id', async(req, res)=>{
       const item = req.body;
       const id = req.params.id;
       const filter = {_id: new ObjectId(id)}
       const updatedDoc = {
        $set:{
          name: item.name,
          category: item.category,
          age: item.age,
          location: item.location,
          shortDescription: item.shortDescription,
          longDescription: item.longDescription,
          imageUrl: item.imageUrl
        }
       }
       const result = await petCollection.updateOne(filter, updatedDoc);
       res.send(result);

    })
    

    //donation related apis

    app.post('/donations', async(req, res)=>{
      const donation = req.body;
      const result = await donationCollection.insertOne(donation);
      res.send(result);
    })

    app.get('/donations', async(req,res)=>{
    const result = await donationCollection.find().toArray();
    res.send(result);
    })

    // to Get Donators for a Donation Campaign to show in modal of MyDonationCampaigns start

    app.get('/donation-campaigns/:campaignId/donators', async (req, res) => {
      const { campaignId } = req.params;
  
      try {
          // Query to find donations by campaign id
          const donations = await donationAmountCollection
              .find({ id: campaignId }) // Find donations for the specific campaign
              .toArray();
  
          if (donations.length === 0) {
              return res.status(404).json({ message: 'No donations found for this campaign.' });
          }
  
          // Map through the donations to return donator details as per frontend structure
          const donators = donations.map(donation => ({
              email: donation.email,
              donationAmount: donation.donationAmount,
              transactionId: donation.transactionId,
              date: donation.date,
              petName: donation.petName
          }));
  
          res.json({ donators });
      } catch (error) {
          console.error('Error fetching donators:', error);
          res.status(500).json({ message: 'Internal server error' });
      }
  });

  // to Get Donators for a Donation Campaign to show in modal of MyDonationCampaigns end

    app.get('/donations/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donationCollection.findOne(query);
      res.send(result);
    })

    app.patch('/donations/update/:id', async(req, res)=>{
      const item = req.body;
      console.log(item);
       const id = req.params.id;
       const filter = {_id: new ObjectId(id)}
       const updatedDoc = {
        $set:{
          petname: item.petname,
          maxDonation: item.maxDonation,
          lastDate: item.lastDate,
          
          shortDescription: item.shortDescription,
          longDescription: item.longDescription,
          imageUrl: item.imageUrl
        }
       }
       const result = await donationCollection.updateOne(filter, updatedDoc);
       res.send(result);
    })

    app.get('/donations/users/:email', async(req, res)=>{
      const email = req.params.email;
      const query = {email: email};
      const result = await donationCollection.find(query).toArray();
      res.send(result);
    })

    app.put('/donation-campaigns/:id/pause', async (req, res) => {
      const { id } = req.params;
      const { isPaused } = req.body;
  
      if (typeof isPaused !== 'boolean') {
          return res.status(400).send({ message: 'Invalid pause status' });
      }
  
      try {
          // Update the pause status in the database
          const result = await donationCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { isPaused: isPaused } }
          );
  
          if (result.modifiedCount === 0) {
              return res.status(404).send({ message: 'Donation campaign not found' });
          }
  
          res.send({ message: 'Pause status updated successfully' });
      } catch (error) {
          console.error('Error updating pause status:', error);
          res.status(500).send({ message: 'Internal Server Error' });
      }
  });

  app.delete('/donation-campaigns/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await donationCollection.deleteOne(query);
    res.send(result);

  })

  //donation Amount related apis' (***************************)
  app.get('/donationAmount', async(req, res)=>{
    const result = await donationAmountCollection.find().toArray();
    res.send(result);
  })

  //  Adopt related apis'

  app.post('/adopt', async (req, res) => {
    const adoptData = req.body;
    const result = await adoptCollection.insertOne(adoptData);
    res.send(result);
  })

  //adoptrequest by user (its not working , now try with below one)
  // app.get('/adopt/users/:email', async(req, res)=>{
  //   const email = req.params.email;
  //   const query = {userEmail: email};
  //   const result = await adoptCollection.find(query).toArray();
  //   res.send(result);
  // })

  // app.get('/adoption-requests', async (req, res) => {
  //   try {
  //     console.log('Received request for adoption requests');
  //     const adoptionRequests = await adoptCollection.find().toArray();
  //     console.log('Found adoption requests:', adoptionRequests);
  //     res.json(adoptionRequests);
  //   } catch (error) {
  //     console.error('Error fetching adoption requests:', error);
  //     res.status(500).json({ message: 'Error fetching adoption requests', error });
  //   }
  // });
  

  // to fetch adoption requests related to the pets added by the currently logged-in user.
  // app.get('/adoption-requests', async (req, res) => {
  app.get('/adoption-requests/:email', async (req, res) => {
  try {
    // const userEmail = req.user.email; // Get the logged-in user's email from the request
    // const userEmail = "satyajit.numista@gmail.com"; // Get the logged-in user's email from the request
    const userEmail = req.params.email;
    // Fetch pets added by the user
    const userPets = await petCollection.find({ email: userEmail }).toArray();
    const userPetIds = userPets.map(pet => pet._id.toString());

    // Fetch adoption requests for these pets
    const adoptionRequests = await adoptCollection.find({ petId: { $in: userPetIds } }).toArray();

    res.json(adoptionRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching adoption requests', error });
  }
});

// to handle the accept and reject actions, updating the status of the adoption request in the database.

app.post('/adoption-requests/:id/accept', async (req, res) => {
  const requestId = req.params.id;

  await adoptCollection.updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: 'Accepted' } }
  );

  res.status(200).json({ message: 'Adoption request accepted' });
});

app.post('/adoption-requests/:id/reject', async (req, res) => {
  const requestId = req.params.id;

  await adoptCollection.updateOne(
    { _id: new ObjectId(requestId) },
    { $set: { status: 'Rejected' } }
  );

  res.status(200).json({ message: 'Adoption request rejected' });
});




  //payment intent
  app.post('/create-payment-intent', async(req, res)=>{
    const {donationAmount} = req.body;
    const amount = parseInt(donationAmount*100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_types:['card']
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  })

  // app.post('/payments', async (req, res)=>{
  //   // const payment = req.body;
  //   const { email, donationAmount,date, transactionId } = req.body;

  //   const payment = {
  //     email,
  //     donationAmount,
  //     date,
  //     transactionId
  //   };

  //   const donationResult = await donationAmountCollection.insertOne(payment)

  //   //now increase currentAmount in donation campaign
  //   const updateResult = await donationCollection.updateOne(
  //     // { email: email }, // Assuming each donation is associated with a campaign identified by email or another unique identifier
  //     {
  //       $inc: {
  //         currentAmount: donationAmount // Increment currentAmount by donationAmount
  //       }
  //     }
  //   );
  //   if (updateResult.modifiedCount === 0) {
  //     return res.status(404).send({ message: 'Campaign not found' });
  //   }
  //   console.log('Payment processed for user:');
  //   res.send({ message: 'Payment processed successfully', donationResult });
  //   console.log('Payment info', payment);
  //   // res.send(donationResult)

  // })

  app.post('/payments', async (req, res) => {
    const { id, email, donationAmount, date, transactionId, petName, petImage } = req.body;
  
    const payment = {
      id,
      email,
      donationAmount,
      date,
      transactionId,
      petName,
      petImage
    };
  
    try {
      // Insert the payment record into donationAmountCollection
      const donationResult = await donationAmountCollection.insertOne(payment);
  
      // Update the currentAmount in the corresponding donation campaign
      const updateResult = await donationCollection.updateOne(
        { _id: new ObjectId(id) }, // Ensure the correct field for identifying the campaign is used
        {
          $inc: {
            currentAmount: donationAmount // Increment currentAmount by donationAmount
          }
        }
      );
  
      if (updateResult.modifiedCount === 0) {
        return res.status(404).send({ message: 'Campaign not found' });
      }
  
      console.log('Payment processed for user:', email);
  
      // Send a success response
      res.send({ message: 'Payment processed successfully', donationResult });
  
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).send({ message: 'Internal Server Error', error });
    }
  });

  
  


  



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('TailTales is runing')
})

app.listen(port, () => {
  console.log(`TailTales is running on port ${port}`);
})