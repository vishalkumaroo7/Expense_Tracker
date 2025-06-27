const Razorpay = require('razorpay');
const db = require('../config/db');
require('dotenv').config();
const fs = require('fs');
const fastcsv = require('fast-csv');
const crypto = require('crypto');
const path = require('path');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Upgrade User to Premium
const upgradeToPremium = async (req, res) => {
    try {
        const amount = 49900; // Rs. 499.00 in paise
        const options = {
            amount,
            currency: 'INR',
            receipt: `order_rcptid_${req.user.id}`
        };

        const order = await razorpay.orders.create(options);
        res.json({
            orderId: order.id,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Razorpay error:", error);
        res.status(500).json({ message: "Error creating order" });
    }
};

// Confirm Premium Status after successful payment
const confirmPremium = (req, res) => {
    const { paymentId, orderId, signature } = req.body;

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(orderId + "|" + paymentId);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).json({ message: "Payment verification failed" });
    }

    const userId = req.user.id;
    db.query("UPDATE users SET premium = 1 WHERE id = ?", [userId], (err) => {
        if (err) {
            console.error("Error upgrading to premium:", err);
            return res.status(500).json({ message: "Error upgrading" });
        }

        // Get updated token with premium status
        db.query("SELECT * FROM users WHERE id = ?", [userId], (err, result) => {
            if (err || result.length === 0) {
                return res.status(500).json({ message: "User update failed" });
            }

            const user = result[0];
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { id: user.id, email: user.email, premium: user.premium },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({ message: "Upgraded to premium!", token });
        });
    });
};

// Leaderboard: Show top spenders
const getLeaderboard = (req, res) => {
    const query = `
        SELECT users.id, COALESCE(users.username, 'Unknown') AS name, 
               COALESCE(SUM(expenses.amount), 0) AS totalExpense 
        FROM users 
        LEFT JOIN expenses ON users.id = expenses.user_id 
        GROUP BY users.id, users.username  
        ORDER BY totalExpense DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching leaderboard:", err);
            return res.status(500).json({ message: "Error fetching leaderboard" });
        }
        res.json(results);
    });
};



// Download Expenses (Only for Premium Users)


const downloadExpenses = (req, res) => {
    const userId = req.user.id;

    // Ensure downloads directory exists
    const downloadsDir = path.join(__dirname, '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });  // Creates the directory if it doesn't exist
    }

    db.query("SELECT premium FROM users WHERE id = ?", [userId], (err, results) => {
        if (err || results.length === 0 || !results[0].premium) {
            return res.status(403).json({ message: "Access denied. Upgrade to premium." });
        }

        db.query("SELECT category, amount FROM expenses WHERE user_id = ?", [userId], (err, expenses) => {
            if (err) {
                return res.status(500).json({ message: "Error fetching expenses" });
            }

            if (expenses.length === 0) {
                return res.status(404).json({ message: "No expenses found" });
            }

            const filePath = path.join(downloadsDir, `expenses_${userId}.csv`);
            const ws = fs.createWriteStream(filePath);

            fastcsv.write(expenses, { headers: true }).pipe(ws);

            ws.on('finish', () => {
                res.download(filePath, `expenses_${userId}.csv`, (downloadErr) => {
                    if (downloadErr) {
                        console.error("Error downloading file:", downloadErr);
                        return res.status(500).json({ message: "Error downloading file" });
                    }
                    setTimeout(() => fs.unlinkSync(filePath), 10000); // Delete file after 10 seconds
                });
            });
        });
    });
};


module.exports = { upgradeToPremium, confirmPremium, getLeaderboard, downloadExpenses };
