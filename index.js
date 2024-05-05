const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000;


app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ew1qftb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = async(req, res, next) => {
    console.log('callad', req.host, req.originalUrl)
    next()
}

const verifyToken = async(req, res, next) => {
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({message: 'not authrize' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
       
        if(err){
            console.log(err)
            return res.status(401).send({message: ' Unauthrize' })
        }
        console.log('value in the token', decoded)
        req.user = decoded;
        next()
    })
   
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const bookCollection = client.db('carDoctor').collection('books');

    app.post('/jwt', logger, async(req, res) => {
        const user = req.body;
        console.log(user)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
           
        })
        .send({success: true})
    })

    app.get('/services', logger, async(req, res) => {
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get ('/services/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const options = {
            projection: { title:1, price:1, service_id:1, img:1 }
        }

        const result = await serviceCollection.findOne(query, options)
        res.send(result);
    })

    app.get('/books',logger, verifyToken, async(req, res) => {
        console.log(req.query.email);
        // console.log('tok tok token', req.cookies.token)
        let query = {}
        if(req.query?.email){
            query = {email: req.query.email};
        }
        const result = await bookCollection.find(query).toArray();
        res.send(result)
    })


    app.post('/books', async(req, res) => {
        const book = req.body;
        console.log(book)
        const result = await bookCollection.insertOne(book)
        res.send(result);
    })

    app.patch('/books/:id', async(req, res) => {
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updatedBookin = req.body;
        console.log(updatedBookin)
        const updateDoc = {
            $set : {
                status: updatedBookin.status
            },
        }
        const result = await bookCollection.updateOne(filter, updateDoc)
        res.send(result);
    })

    app.delete('/books/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await bookCollection.deleteOne(query)
        res.send(result)
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



app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log(`doctor server is running on port: ${port}`)
})