const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);

const expenseRoutes = require('./src/routes/expenseRoutes');
app.use('/api/expenses', expenseRoutes);

// Serve the expense tracker page (as per your request)
app.get('/expenseTracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'expenseTracker.html')); // Adjust path if needed
});

// Import the premiumRoutes with corrected path
const premiumRoutes = require('./src/routes/premiumRoutes');
app.use('/api/premium', premiumRoutes);


// Import the purchaseRoutes with corrected path
const purchaseRoutes = require('./src/routes/purchaseRoutes');
app.use('/api/purchase', purchaseRoutes); // ✅ Correct prefix


// Default route for the home page
app.get('/', (req, res) => {
    res.send('Welcome to the Expense Tracker API');
});

// Handle 404 errors for non-existent routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'Page not found' });
});

// Set the server to listen on a specific port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
