const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // Database connection
const nodemailer = require('nodemailer');
require('dotenv').config();

// Signup function
const signup = (req, res) => {
    const { username, email, password } = req.body;
  
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
  
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).json({ message: "Error hashing password" });
        }
  
        const query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        db.query(query, [username, email, hashedPassword], (err, result) => {
            if (err) {
                console.error("Error creating user:", err);
                return res.status(500).json({ message: "Error creating user" });
            }
            
            console.log("User created successfully"); // Debugging
            
            // Return response with message
            return res.status(201).json({ message: "User created successfully, please log in" });
        });
    });
};

// Login function
const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Email and password are required");
    }

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).send("Server error");
        }

        if (results.length === 0) {
            return res.status(400).send("User not found");
        }

        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).send("Error checking password");
            }

            if (!match) {
                return res.status(400).send("Incorrect password");
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        });
    });
};

// Forgot Password function
const forgotPassword = (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send("Email is required");
    }

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Server error");
        }

        if (results.length === 0) {
            return res.status(400).send("User not found");
        }

        // Generate reset token
        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });

        // Create Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Click the link to reset your password: http://localhost:3000/reset-password.html?token=${resetToken}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).send("Error sending email");
            }
            res.json({ message: "Password reset link sent to email" });
        });
    });
};

// Reset Password function
const resetPassword = (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).send("Token and new password are required");
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(400).send("Invalid or expired token");
        }

        const email = decoded.email;
        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
                console.error("Error hashing new password:", err);
                return res.status(500).send("Error hashing new password");
            }

            const query = "UPDATE users SET password = ? WHERE email = ?";
            db.query(query, [hashedPassword, email], (err, result) => {
                if (err) {
                    console.error("Error updating password:", err);
                    return res.status(500).send("Error updating password");
                }
                res.send("Password reset successfully");
            });
        });
    });
};

module.exports = { signup, login, forgotPassword, resetPassword };
