const express = require('express');
const { 
  createExpense, 
  getExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense 
} = require('../controllers/expenses.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true }); 
// mergeParams to allow /api/groups/:groupId/expenses

router.use(requireAuth);

// Note: when mounted at /api/groups/:groupId/expenses, these map perfectly
router.post('/', createExpense);
router.get('/', getExpenses);

// These would normally be mounted at /api/expenses/:id, but for simplicity
// we can also route them here if we adjust the main router
router.get('/:id', getExpenseById);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
