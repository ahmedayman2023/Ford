import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// MongoDB Connection
const DB = process.env.MONGODB_URI;

if (DB) {
  mongoose.connect(DB, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => {
      console.log('✅ تم الاتصال بنجاح!');
      seedDB();
    })
    .catch(err => {
      console.error("MongoDB connection error:", err.message);
    });
} else {
  console.warn("MONGODB_URI not found in environment variables. Running without DB.");
}

// Product Schema
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  image: String,
  description: String,
  compatibility: [String],
  stock: Number
});

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

// API Routes
app.get("/api/products", async (req, res) => {
  try {
    // Check if DB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected", fallback: true });
    }
    const products = await Product.find().maxTimeMS(3000); // 3s timeout for the query
    res.json(products);
  } catch (error: any) {
    console.error("Fetch products error:", error.message);
    res.status(500).json({ error: "Failed to fetch products", message: error.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to add product", message: error.message });
  }
});

app.get("/api/db-status", (req, res) => {
  res.json({ 
    connected: mongoose.connection.readyState === 1,
    uri: process.env.MONGODB_URI ? "Configured" : "Missing"
  });
});

// Seed Initial Data if empty
async function seedDB() {
  if (!DB) return;
  const count = await Product.countDocuments();
  if (count === 0) {
    const initialParts = [
      {
        name: 'Motorcraft Brake Pads',
        category: 'Brakes',
        price: 85.00,
        image: 'https://picsum.photos/seed/brakepads/400/300',
        description: 'Original Motorcraft brake pads for Ford F-150.',
        compatibility: ['F-150 2015-2023', 'Expedition 2018+'],
        stock: 24
      },
      {
        name: 'Oil Filter FL-820S',
        category: 'Engine',
        price: 12.50,
        image: 'https://picsum.photos/seed/oilfilter/400/300',
        description: 'Genuine Motorcraft oil filter for V8 engines.',
        compatibility: ['Mustang 2005-2023', 'F-150 5.0L'],
        stock: 150
      },
      {
        name: 'Spark Plug Set (8pcs)',
        category: 'Electrical',
        price: 96.00,
        image: 'https://picsum.photos/seed/sparkplug/400/300',
        description: 'Iridium spark plugs for maximum performance.',
        compatibility: ['Mustang GT 2011-2023', 'Explorer 3.5L EcoBoost'],
        stock: 45
      }
    ];
    await Product.insertMany(initialParts);
    console.log("Database seeded with initial parts");
  }
}

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await seedDB();
  });
}

startServer();
