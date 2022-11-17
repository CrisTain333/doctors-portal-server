const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ObjectId } = require("mongodb");
const PORT = 5000;
const cors = require("cors");

app.use(cors());
app.use(express.json());
require("dotenv").config();

app.get("/", (req, res) => {
  res.send("App On Fire");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@practicebaba.aon4ndq.mongodb.net/?retryWrites=true&w=majority`;

// const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).send({ message: "You are not allowed to do that!" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ message: "You are not allowed to do that!" });
    }

    req.decoded = decoded;
    next();
  });
};

const run = () => {
  const appointmentOptionsCollection = client
    .db("doctorPortal")
    .collection("availableOptions");
  const bookingsCollection = client.db("doctorPortal").collection("bookings");

  try {
    app.post("/jwt", async (req, res) => {
      const payload = req.body;
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });
      res.json(token);
    });

    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appointmentOptionsCollection.find(query).toArray();

      // get the bookings of the provided date
      const bookingQuery = { appointmentDate: date };
      const alreadyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();

      // code carefully :D
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatmentName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const user = req.decoded;
      const query = req.query.email;
      if (user?.email !== query) {
        return res
          .status(403)
          .send({ message: "You are not allowed to do that!" });
      }

      const filter = { email: query };
      const result = await bookingsCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatmentName: booking.treatmentName,
      };

      const alreadyBooked = await bookingsCollection.find(query).toArray();

      if (alreadyBooked.length) {
        const message = `You already have a booking on ${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }

      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });
  } finally {
  }
};

run();

app.listen(PORT, () => {
  console.log(`App Running On Port ${PORT} `);
  client.connect((err) => {
    if (err) {
      return console.log(err);
    }
    console.log("Connected To Database");
  });
});
