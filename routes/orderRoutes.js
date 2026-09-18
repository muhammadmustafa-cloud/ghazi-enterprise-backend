import express from 'express';
import { createOrder, getOrders, updateOrderStatus, deleteOrder } from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', createOrder);
router.get('/', protect, admin, getOrders);
router.patch('/:id/status', protect, admin, updateOrderStatus);
router.delete('/:id', protect, admin, deleteOrder);

export default router;
