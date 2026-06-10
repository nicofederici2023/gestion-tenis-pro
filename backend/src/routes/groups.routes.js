const express = require('express');
const { 
  createGroup, 
  getGroups, 
  getGroupById, 
  updateGroup, 
  deleteGroup, 
  joinGroup, 
  getGroupMembers,
  addMemberByEmail,
  addLocalMember,
  linkLocalMember,
  deleteMember,
  editLocalMember
} = require('../controllers/groups.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const expensesRoutes = require('./expenses.routes');
const balancesRoutes = require('./balances.routes');

const router = express.Router();

router.use(requireAuth); // All group routes require authentication

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/join', joinGroup);
router.get('/:id/members', getGroupMembers);
router.post('/:id/members', addMemberByEmail);
router.post('/:id/members/local', addLocalMember);
router.post('/:id/members/:memberId/link', linkLocalMember);
router.delete('/:id/members/:memberId', deleteMember);
router.put('/:id/members/:memberId/local', editLocalMember);

// Sub-rutas asociadas a grupos
router.use('/:groupId/expenses', expensesRoutes);
router.use('/:groupId/balances', balancesRoutes);

module.exports = router;
