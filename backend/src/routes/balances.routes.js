const express = require('express');
const { 
  getBalances,
  getSettlement,
  settleDebt
} = require('../controllers/balances.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', getBalances);
router.get('/settlement', getSettlement);
router.post('/settle', settleDebt);

module.exports = router;
