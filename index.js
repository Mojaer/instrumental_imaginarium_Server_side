const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000


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
        await client.connect();
        const database = client.db('instrumental-imaginarium');
        const userCollection = database.collection('users')
        const classCollection = database.collection('Classes');

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


        //Classes added to the server
        app.post('/classes', async (req, res) => {
            const classDetails = req.body
            const result = await classCollection.insertOne(classDetails);
            res.status(200).send(result);
        })

        //classes to update TODO: patch
        app.patch('/classes/:id', async (req, res) => {
            const id = req.params.id
            const classUpdate = req.body
            console.log(classUpdate, id)
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