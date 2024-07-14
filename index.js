const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const verifyToken = require("./verify");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5426;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", 'https://assignment-11-a2a25.web.app'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());
// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.b5qg8rw.mongodb.net`;

// MongoDB Client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    // await client.connect();
    const kraftFix = client.db("kraftFix");
    const services = kraftFix.collection("services");
    const bookings = kraftFix.collection("bookings");
    // JWT TOKEN GENERATOR
    app.post("/token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV ? "none" : "strict",
        })
        .send({ success: true, token });
    });
    // JWT COOKIE REMOVER
    app.get("/logOut", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });
    // CRUD
    app.get("/services", async (req, res) => {
      const populer = await services.find().limit(6).toArray();
      res.send(populer);
    });
    // Route to fetch all services with pagination
    app.get("/allServices", async (req, res) => {
      const size = parseInt(req.query.size);
      const search = req.query.search;
      const skip = parseInt(req.query.skip) - 1;
      let query = {};
      if (search) {
        query = {
          serviceName: { $regex: search, $options: "i" },
        };
      }
      const allService = await services.find(query).skip(size * skip).limit(size).toArray();
      res.send({ services: allService });
    });
    // Services Data Length
    app.get("/servicesTotalLength", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query = {
          serviceName: { $regex: search, $options: "i" },
        };
      }
      const totalLength = await services.countDocuments(query);
      res.send({ totalLength });
    });

    // Add Service Api
    app.post("/services", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await services.insertOne({ ...data });
      res.send(result);
    });
    // Add Booking Api
    app.post("/bookings", async (req, res) => {
      const data = req.body;
      const result = await bookings.insertOne(data);
      res.send(result);
    });
    // Single Service
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const target = new ObjectId(id);
      const result = await services.findOne(target);
      res.send(result);
    });
    // Manage Services
    app.get("/service/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = req.user.email;
      if (email !== user) {
        return res.status(403).send({ message: "forbidden access" });
      } else {
        const query = { providerEmail: email };
        const result = await services.find(query).toArray();
        res.send(result);
      }
    });
    // Delete Service
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const target = { _id: new ObjectId(id) };
      const result = await services.deleteOne(target);
      res.send(result);
    });
    // Update Service
    app.put("/services/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const options = { upsert: true };
      const target = { _id: new ObjectId(id) };
      const result = await services.updateOne(target, { $set: data }, options);
      res.send(result);
    });
    // Client Bookings
    app.get("/bookings/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = req.user.email;
      if (email !== user) {
        return res.status(403).send({ message: "forbidden access" });
      } else {
        const query = { userEmail: email };
        const result = await bookings.find(query).toArray();
        res.send(result);
      }
    });
    // Services To Do
    app.get("/servicesToDo/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const user = req.user.email;
      if (email !== user) {
        return res.status(403).send({ message: "forbidden access" });
      } else {
        const query = { providerEmail: email };
        const result = await bookings.find(query).toArray();
        res.send(result);
      }
    });
    app.patch("/bookings", async (req, res) => {
      const id = req.query.id;
      const { stat } = req.body;
      const target = new ObjectId(id);

      const query = { _id: target };
      const updatedStatus = { status: stat };
      const result = await bookings.updateOne(query, { $set: updatedStatus });
      res.send(result);
    });
  } finally {
    // Ensure the client will close when finished or errors occur
    // await client.close();
  }
}
connectToMongoDB().catch(console.error);

// Routes
app.get("/", (req, res) => {
  res.send("Hello kraftFix");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
