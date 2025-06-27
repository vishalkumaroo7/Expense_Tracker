const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { 
  upgradeToPremium, 
  getLeaderboard, 
  downloadExpenses, 
  confirmPremium 
} = require('../controllers/premiumController');

// Route to initiate upgrade to premium (Razorpay order creation)
router.post('/upgrade', authenticate, upgradeToPremium);

// Route to fetch leaderboard (only for premium users)
router.get('/leaderboard', authenticate, getLeaderboard);

// Route to download expenses (only for premium users)
router.get('/download', authenticate, downloadExpenses);

// Route to confirm payment and set user as premium
router.post('/confirm', authenticate, confirmPremium);

module.exports = router;
