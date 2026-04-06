import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Stripe Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  try {
    const { items } = req.body;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "sar",
        product_data: {
          name: item.name,
          images: item.images,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects amount in cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}?success=true`,
      cancel_url: `${appUrl}?canceled=true`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe session error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploads statically
app.use("/uploads", express.static(uploadDir));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

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
  images: [String],
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
    const products = await (Product as any).find().maxTimeMS(3000); // 3s timeout for the query
    res.json(products);
  } catch (error: any) {
    console.error("Fetch products error:", error.message);
    res.status(500).json({ error: "Failed to fetch products", message: error.message });
  }
});

app.post("/api/products", upload.array("images", 10), async (req, res) => {
  console.log("POST /api/products hit", req.body);
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database not connected" });
    }

    const productData = { ...req.body };
    
    // Handle uploaded files
    if (req.files && Array.isArray(req.files)) {
      const fileUrls = (req.files as Express.Multer.File[]).map(
        (file) => `/uploads/${file.filename}`
      );
      productData.images = fileUrls;
    } else if (req.body.images && typeof req.body.images === 'string') {
      // If images come as a single string (URL)
      productData.images = [req.body.images];
    } else if (!productData.images) {
      productData.images = [];
    }

    // Convert price and stock to numbers if they come as strings
    if (typeof productData.price === 'string') productData.price = parseFloat(productData.price);
    if (typeof productData.stock === 'string') productData.stock = parseInt(productData.stock);
    if (typeof productData.compatibility === 'string') {
      try {
        productData.compatibility = JSON.parse(productData.compatibility);
      } catch (e) {
        productData.compatibility = productData.compatibility.split(',').map((s: string) => s.trim());
      }
    }

    const newProduct = new Product(productData);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    console.error("Add product error:", error.message);
    res.status(500).json({ error: "Failed to add product", message: error.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await (Product as any).findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch product", message: error.message });
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
  try {
    const count = await (Product as any).countDocuments();
    // If we want to force the new products, we could clear the DB, 
    // but let's just add them if the count is low or specific to old data
    if (count <= 3) { // Assuming the 3 initial parts were there
      await (Product as any).deleteMany({});
      
      const initialParts = [
        {
          name: 'بي تي طقم مساحات هايبرد 20',
          category: 'مساحات',
          price: 20.00,
          images: ['https://picsum.photos/seed/wiper20/400/300'],
          description: 'طقم مساحات هايبرد مقاس 20 بوصة بجودة عالية وأداء ممتاز في جميع الظروف الجوية.',
          compatibility: ['Universal'],
          stock: 50
        },
        {
          name: 'بي تي طقم مساحات هايبرد 22',
          category: 'مساحات',
          price: 20.00,
          images: ['https://picsum.photos/seed/wiper22/400/300'],
          description: 'طقم مساحات هايبرد مقاس 22 بوصة بتصميم انسيابي يقلل الضوضاء ويوفر رؤية واضحة.',
          compatibility: ['Universal'],
          stock: 45
        },
        {
          name: 'بي تي طقم مساحات هايبرد 24',
          category: 'مساحات',
          price: 20.00,
          images: ['https://picsum.photos/seed/wiper24/400/300'],
          description: 'طقم مساحات هايبرد مقاس 24 بوصة متين ومقاوم للتآكل.',
          compatibility: ['Universal'],
          stock: 40
        },
        {
          name: 'بي تي طقم مساحات هايبرد 26',
          category: 'مساحات',
          price: 20.00,
          images: ['https://picsum.photos/seed/wiper26/400/300'],
          description: 'طقم مساحات هايبرد مقاس 26 بوصة لأقصى تغطية للزجاج الأمامي.',
          compatibility: ['Universal'],
          stock: 35
        },
        {
          name: 'قفل عجلة قيادة السيارة',
          category: 'إكسسوارات أمان',
          price: 51.75,
          images: ['https://picsum.photos/seed/steeringlock/400/300'],
          description: 'قفل حماية عالي الجودة لعجلة القيادة، سهل التركيب ويوفر أماناً إضافياً لسيارتك.',
          compatibility: ['Universal'],
          stock: 20
        },
        {
          name: 'ام او بي مفرد مساحة 20 هايبرد',
          category: 'مساحات',
          price: 10.01,
          images: ['https://picsum.photos/seed/mob20/400/300'],
          description: 'مساحة مفردة هايبرد مقاس 20 بوصة من ماركة MOB.',
          compatibility: ['Universal'],
          stock: 100
        },
        {
          name: 'ام او بي مفرد مساحة 22 هايبرد',
          category: 'مساحات',
          price: 10.01,
          images: ['https://picsum.photos/seed/mob22/400/300'],
          description: 'مساحة مفردة هايبرد مقاس 22 بوصة من ماركة MOB.',
          compatibility: ['Universal'],
          stock: 90
        },
        {
          name: 'ام او بي مفرد مساحة 24 هايبرد',
          category: 'مساحات',
          price: 10.01,
          images: ['https://picsum.photos/seed/mob24/400/300'],
          description: 'مساحة مفردة هايبرد مقاس 24 بوصة من ماركة MOB.',
          compatibility: ['Universal'],
          stock: 85
        },
        {
          name: 'بي تي مساحات طقم هايبرد 14',
          category: 'مساحات',
          price: 10.01,
          images: ['https://picsum.photos/seed/wiper14/400/300'],
          description: 'طقم مساحات هايبرد مقاس 14 بوصة مخصص للزجاج الخلفي أو السيارات الصغيرة.',
          compatibility: ['Universal'],
          stock: 60
        },
        {
          name: 'بي تي طقم مساحات هايبرد 18',
          category: 'مساحات',
          price: 20.00,
          images: ['https://picsum.photos/seed/wiper18/400/300'],
          description: 'طقم مساحات هايبرد مقاس 18 بوصة يوفر أداءً هادئاً وفعالاً.',
          compatibility: ['Universal'],
          stock: 55
        }
      ];
      await Product.insertMany(initialParts);
      console.log("Database seeded with new products from image");
    }
  } catch (error: any) {
    console.error("Seeding error:", error.message);
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

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });
}

startServer();
