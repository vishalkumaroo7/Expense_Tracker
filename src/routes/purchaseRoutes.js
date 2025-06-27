const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');
const db = require('../config/db');
require('dotenv').config();

const router = express.Router();

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Route to initiate payment for premium membership
router.post('/premium', authenticate, async (req, res) => {
    try {
        console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID); // Debugging

        const options = {
            amount: 49900, 
            currency: 'INR',
            receipt: `order_rcptid_${req.user.id}`,
        };

        const order = await razorpay.orders.create(options);
        console.log("Order created:", order); // Debugging

        res.json({ orderId: order.id, key: process.env.RAZORPAY_KEY_ID || "undefined_key" });
    } catch (err) {
        console.error("Error creating Razorpay order:", err);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
});

// Route to verify payment and upgrade user to premium
// Route to verify payment and upgrade user to premium
router.post('/verify', authenticate, async (req, res) => { 
    try {
        const { paymentId, orderId, signature } = req.body;

        // Log received payment details
        console.log("Received payment details:", { paymentId, orderId, signature });

        if (!paymentId || !orderId || !signature) {
            return res.status(400).json({ message: 'Invalid payment details' });
        }

        // Verify payment signature using Razorpay secret key
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(orderId + "|" + paymentId);
        const expectedSignature = hmac.digest('hex');

        if (expectedSignature !== signature) {
            console.log("Signature verification failed. Expected:", expectedSignature, "Received:", signature);
            return res.status(400).json({ message: 'Payment verification failed' });
        }

        // Update user to premium in the database
        const query = "UPDATE users SET premium = TRUE WHERE id = ?";
        db.query(query, [req.user.id], async (err) => {
            if (err) return res.status(500).json({ message: 'Error upgrading to premium' });

            // Generate new JWT token with updated premium status
            const updatedToken = jwt.sign(
                { id: req.user.id, premium: true }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1h' }
            );

            // Log the success response
            console.log("Payment verification successful. Sending response:", {
                message: 'Upgraded to premium!',
                success: true,
                token: updatedToken
            });

            // Send success response
            res.json({ message: 'Upgraded to premium!', success: true, token: updatedToken });
        });
    } catch (err) {
        console.error("Payment verification error:", err);
        res.status(500).json({ message: 'Error verifying payment' });
    }
});


module.exports = router;
