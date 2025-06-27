const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate'); // Import authentication middleware
const {
    addExpense,
    getExpenses,
    deleteExpense,
    getTotalExpense,
    getLeaderboard,
    downloadExpenses
} = require('../controllers/expenseController');

// Define routes with authentication middleware
router.post('/add', authenticate, addExpense);  // Add an expense (protected route)
router.get('/list', authenticate, getExpenses);  // List all expenses for a user (protected route)
router.delete('/delete/:expenseId', authenticate, deleteExpense);  // Delete an expense by ID (protected route)
router.get('/total', authenticate, getTotalExpense);  // Get total expenses for a user (protected route)

// Premium features
router.get('/leaderboard', authenticate, getLeaderboard);  // Get top spenders (Premium feature)
router.get('/download', authenticate, downloadExpenses);  // Download expenses as CSV (Premium feature)

module.exports = router;
