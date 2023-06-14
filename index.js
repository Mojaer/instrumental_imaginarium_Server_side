const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000
const stripe = require("stripe")('sk_test_51NFLIYAO8cJgagXe52dlbiBDw4LBTPrRxCrkOJuOnaQqpi3XpeKh0Hz30Lu7dQtCOjuXfO7sOYXDEyjHGdhFMJP700gr8z1O1p')
// (process.env.PAYMENT_SECRET_KEY does not work)


app.use(express.json());
app.use(cors());
require('dotenv').config();




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_ACC}:${process.env.DB_PASS}@cluster0.8odccbh.mongodb.net/?retryWrites=true&w=majority`;

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
        // await client.connect();
        const database = client.db('instrumental-imaginarium');
        const userCollection = database.collection('users')
        const classCollection = database.collection('Classes');
        const selectedClassCollection = database.collection('selectedClasses');
        const paymentCollection = database.collection('payments');

        //get method for the user collection
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            // console.log(result)
            res.status(200).send(result)
        })

        // admin:path to update the user role
        app.patch('/users/:id', async (req, res) => {
            const role = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateRole = {
                $set: {
                    role: role.role
                }
            }
            const result = await userCollection.updateOne(filter, updateRole)
            res.send(result)
        })



        //specific instructor"s Classes get from the server
        app.get('/classes', async (req, res) => {
            const email = req.query.email
            const query = { InstructorEmail: email }
            const result = await classCollection.find(query).toArray();
            res.send(result);
        })

        // get specific class with ID 
        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query)
            res.send(result);
        })

        // get all classes 
        app.get('/allClasses', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })

        // get all selected classes by students 
        app.get('/selectedClasses', async (req, res) => {
            const result = await selectedClassCollection.find().toArray();
            res.send(result);
        })


        //Classes added to the server
        app.post('/classes', async (req, res) => {
            const classDetails = req.body
            const result = await classCollection.insertOne(classDetails);
            res.status(200).send(result);
        })



        // admin:post method for the user collection
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const previousUser = await userCollection.findOne(query)
            // console.log(previousUser);
            if (previousUser) {
                res.send('user already exist')
            }
            else {
                const result = await userCollection.insertOne(user);
                res.status(200).send(result);
            }
        })

        //Students selected class post
        app.post('/selectedClass', async (req, res) => {
            const selectedClass = req.body;
            const query = { id: selectedClass.id, studentEmail: selectedClass.studentEmail }
            const existing = await selectedClassCollection.findOne(query);
            if (existing) {
                res.send({ message: 'you have already selected this class' })
            }
            else {
                const result = await selectedClassCollection.insertOne(selectedClass)
                res.send(result)
            }


        })

        //classes to update TODO: patch
        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id
            const classUpdate = req.body
            // console.log(classUpdate, id)
            const filter = { _id: new ObjectId(id) }
            const updateClass = {
                $set: {
                    ClassName: classUpdate.updateClassName,
                    availableSeats: classUpdate.updateAvailableSeats,
                    price: classUpdate.updatePrice,
                    ClassImage: classUpdate.ClassImg
                },
            };
            const result = await classCollection.updateOne(filter, updateClass);
            res.send(result);
        })

        //update the status of the class
        app.patch('/classStatus/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body
            // console.log(status, id);
            const filter = { _id: new ObjectId(id) };
            const updateStatus = {
                $set: {
                    classStatus: status.status
                },
            };
            const result = await classCollection.updateOne(filter, updateStatus)
            // console.log(result);
            res.send(result);
        })

        //set the feedback of the class
        app.patch('/classFeedback/:id', async (req, res) => {
            const id = req.params.id;
            const { feedback } = req.body
            // console.log(feedback, id);
            const filter = { _id: new ObjectId(id) };
            const updateFeedback = {
                $set: {
                    feedback: feedback,
                },
            };
            const result = await classCollection.updateOne(filter, updateFeedback)
            res.send(result);
        })

        //Delete the class by the student
        app.delete('/selectedClass/:id', async (req, res) => {
            const id = req.params
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query);
            res.status(200).send(result);
        })

        // Payment method 
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100
            // console.log(price, amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })

        //get all payments

        app.get('/payments', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        });

        // payment save 
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const query = { _id: new ObjectId(payment.id) }
            const Class = await classCollection.findOne(query)
            const availableSeats = parseInt(Class.availableSeats) - 1
            const seatBooked = parseInt(Class.seatBooked) + 1
            const updateDoc = {
                $set: {
                    seatBooked: seatBooked,
                    availableSeats: availableSeats
                },
            };
            const DeleteSelected = await selectedClassCollection.deleteOne({ id: payment.id })
            const update = await classCollection.updateOne(query, updateDoc);
            // console.log(update);
            const result = await paymentCollection.insertOne(payment);
            res.send(result);

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



app.get('/', async (req, res) => {
    res.status(200).send('server is running');
});

app.listen(port, () => {
    console.log('listening on port http://localhost:%d', port);
});