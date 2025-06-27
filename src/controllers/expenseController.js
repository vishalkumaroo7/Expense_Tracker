const db = require('../config/db');  // Assuming MySQL is set up
const Razorpay = require('razorpay');
const fs = require('fs');
const fastcsv = require('fast-csv');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Add an expense
const addExpense = (req, res) => {
  const { amount, category } = req.body;
  const userId = req.user.id;

  const query = "INSERT INTO expenses (user_id, category, amount) VALUES (?, ?, ?)";
  db.query(query, [userId, category, amount], (err, result) => {
    if (err) {
      console.error('Error adding expense:', err);
      return res.status(500).json({ message: "Error adding expense" });
    }
    res.status(201).json({ message: "Expense added successfully" });
  });
};

// List all expenses for a user
// List all expenses for a user with pagination (5 per page)
const getExpenses = (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;  // Default to page 1 if no page is specified
    const limit = 5;  // Show 5 expenses per page
    const offset = (page - 1) * limit;  // Calculate the offset
  
    const query = "SELECT id, category, amount FROM expenses WHERE user_id = ? LIMIT ? OFFSET ?";
    
    db.query(query, [userId, limit, offset], (err, results) => {
      if (err) {
        console.error("Error retrieving expenses:", err);
        return res.status(500).json({ message: "Error retrieving expenses" });
      }
      res.json(results);
    });
  };
  

// Delete an expense
const deleteExpense = (req, res) => {
  const expenseId = req.params.expenseId;
  const userId = req.user.id;

  const checkQuery = "SELECT * FROM expenses WHERE id = ? AND user_id = ?";
  db.query(checkQuery, [expenseId, userId], (err, results) => {
    if (err) {
      console.error('Error checking expense:', err);
      return res.status(500).json({ message: "Error checking expense" });
    }
    if (results.length === 0) {
      return res.status(403).json({ message: "Unauthorized to delete this expense" });
    }

    const deleteQuery = "DELETE FROM expenses WHERE id = ?";
    db.query(deleteQuery, [expenseId], (err) => {
      if (err) {
        console.error('Error deleting expense:', err);
        return res.status(500).json({ message: "Error deleting expense" });
      }
      res.json({ message: "Expense deleted successfully" });
    });
  });
};

// Get total expense for a user
const getTotalExpense = (req, res) => {
  const userId = req.user.id;
  const query = "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?";
  
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error("Error calculating total:", err);
      return res.status(500).json({ message: "Error calculating total" });
    }
    res.json({ total: result[0].total });
  });
};

// Upgrade to premium
const upgradeToPremium = (req, res) => {
  const userId = req.user.id;
  
  const options = {
    amount: 50000, // Rs. 500
    currency: "INR",
    receipt: `receipt_${userId}`
  };
  
  razorpay.orders.create(options, (err, order) => {
    if (err) {
      console.error("Error creating Razorpay order:", err);
      return res.status(500).json({ message: "Error initiating payment" });
    }
    res.json(order);
  });
};

// Confirm payment and update user status
const confirmPremium = (req, res) => {
  const userId = req.user.id;
  const { paymentId } = req.body;
  
  if (!paymentId) {
    return res.status(400).json({ message: "Payment ID required" });
  }

  const query = "UPDATE users SET premium = TRUE WHERE id = ?";
  db.query(query, [userId], (err) => {
    if (err) {
      console.error("Error updating premium status:", err);
      return res.status(500).json({ message: "Error upgrading user" });
    }
    res.json({ message: "User upgraded to premium successfully" });
  });
};

// Get leaderboard
const getLeaderboard = (req, res) => {
  const query = "SELECT users.id, users.name, COALESCE(SUM(expenses.amount), 0) AS total_spent FROM users LEFT JOIN expenses ON users.id = expenses.user_id GROUP BY users.id ORDER BY total_spent DESC";
  
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching leaderboard:", err);
      return res.status(500).json({ message: "Error fetching leaderboard" });
    }
    res.json(results);
  });
};

// Download expenses (CSV for premium users)
const downloadExpenses = (req, res) => {
  const userId = req.user.id;
  
  const query = "SELECT category, amount FROM expenses WHERE user_id = ?";
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching expenses:", err);
      return res.status(500).json({ message: "Error fetching expenses" });
    }
    
    const csvStream = fastcsv.format({ headers: true });
    const writableStream = fs.createWriteStream("expenses.csv");
    
    csvStream.pipe(writableStream);
    results.forEach(row => csvStream.write(row));
    csvStream.end();
    
    writableStream.on("finish", () => {
      res.download("expenses.csv", (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          return res.status(500).json({ message: "Error downloading file" });
        }
        fs.unlinkSync("expenses.csv"); // Delete the file after download
      });
    });
  });
};


module.exports = { 
  addExpense, 
  getExpenses, 
  deleteExpense, 
  getTotalExpense, 
  upgradeToPremium, 
  confirmPremium, 
  getLeaderboard, 
  downloadExpenses 
};
