require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const multer = require('multer');
const session = require('express-session');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict' }
}));

function isAuthenticated(req, res, next) {
  if (req.session && req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
    return next();
  }
  res.redirect('/login.html');
}

app.get('/login.html', (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin.html');
  }
  next();
});

app.get('/admin.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.js', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.js'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', isAuthenticated);

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    req.session.authenticated = true;
    req.session.user = username;
    return res.redirect('/admin.html');
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

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

const PRODUCTS_FILE = path.join(__dirname, 'public', 'products.json');

function saveProductsToFile(products, res, successMessage) {
  fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), (err) => {
    if (err) return res.status(500).json({ error: '❌ Failed to save products.json' });
    res.status(200).json({ message: successMessage });
  });
}


app.get('/api/products', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '❌ Failed to read products.json' });
    res.json(JSON.parse(data));
  });
});


app.post('/api/products', (req, res) => {
  const newProduct = req.body;

  fs.readFile(PRODUCTS_FILE, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '❌ Failed to read products.json' });

    const products = JSON.parse(data);
    products.push(newProduct);

    saveProductsToFile(products, res, '✅ Product added');
  });
});

app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  fs.readFile(PRODUCTS_FILE, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '❌ Failed to read products.json' });

    let products = JSON.parse(data);
    products = products.filter(p => p.id !== productId);

    saveProductsToFile(products, res, '✅ Product deleted');
  });
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

app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const updatedProduct = req.body;

  fs.readFile(PRODUCTS_FILE, 'utf-8', (err, data) => {
    if (err) return res.status(500).json({ error: '❌ Failed to read products.json' });

    let products = JSON.parse(data);
    const index = products.findIndex(p => p.id === productId);
    if (index === -1) {
      return res.status(404).json({ error: '❌ Product not found' });
    }
    
    products[index] = {
      ...products[index],
      ...updatedProduct
    };

    saveProductsToFile(products, res, '✅ Product updated');
  });
});