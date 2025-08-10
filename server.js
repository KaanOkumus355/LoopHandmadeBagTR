require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const productSchema = new mongoose.Schema({
  id: String,
  name: String,
  order: Number,
  category: String,
  title: String,
  description: String,
  price: String,
  link: String,
  active: Boolean,
  coverImage: String,
  hoverImage: String,
  images: [String]
});

const Product = mongoose.model('Product', productSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
    return next();
  }
  res.redirect('/login.html');
}

app.get('/login.html', (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin-panel');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.authenticated = true;
    req.session.user = username;
    return res.redirect('/admin-panel');
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/admin-panel', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'mugeadminpanel1981.html'));
});

app.get('/admin.js', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.js'));
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ active: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to fetch products' });
  }
});

app.get('/api/admin/products', isAuthenticated, async (req, res) => {
  try {
    const products = await Product.find(); // no filter
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to fetch admin products' });
  }
});

app.use('/api', isAuthenticated);

const PHOTO_DIR = path.join(__dirname, 'public', 'photos');
if (!fs.existsSync(PHOTO_DIR)) {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTO_DIR),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(200).json({ message: '✅ Product added' });
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to add product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const result = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!result) return res.status(404).json({ error: '❌ Product not found' });
    res.status(200).json({ message: '✅ Product updated' });
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await Product.findOneAndDelete({ id: req.params.id });
    if (!result) return res.status(404).json({ error: '❌ Product not found' });
    res.status(200).json({ message: '✅ Product deleted' });
  } catch (err) {
    res.status(500).json({ error: '❌ Failed to delete product' });
  }
});

app.post('/api/upload', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'hoverImage', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), (req, res) => {
  const files = req.files;
  const result = {
    coverImage: files.coverImage ? '/photos/' + files.coverImage[0].filename : null,
    hoverImage: files.hoverImage ? '/photos/' + files.hoverImage[0].filename : null,
    images: files.images ? files.images.map(file => '/photos/' + file.filename) : []
  };
  res.status(200).json(result);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
