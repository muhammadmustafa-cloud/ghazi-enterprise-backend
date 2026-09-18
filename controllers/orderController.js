import db from '../config/db.js';

const shapeOrder = (order, items) => ({
  id: order.id,
  createdAt: order.created_at,
  status: order.status,
  customer: {
    firstName: order.customer_first_name,
    lastName: order.customer_last_name,
    phone: order.customer_phone,
    address: order.customer_address,
    city: order.customer_city,
  },
  delivery: order.delivery_type,
  payment: order.payment_method,
  subtotal: Number(order.subtotal),
  deliveryFee: Number(order.delivery_fee),
  total: Number(order.total),
  items: items.map((item) => ({
    cartItemId: String(item.id),
    id: item.product_id,
    name: item.product_name,
    price: Number(item.unit_price),
    quantity: item.quantity,
    isCustom: Boolean(item.is_custom),
    customDetails: item.custom_details
      ? (typeof item.custom_details === 'string' ? JSON.parse(item.custom_details) : item.custom_details)
      : undefined,
  })),
});

export const createOrder = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { customer, delivery, payment, items, subtotal, deliveryFee, total } = req.body;

    if (!customer?.firstName || !customer?.phone || !items?.length) {
      return res.status(400).json({ message: 'Missing required order fields' });
    }

    const orderId = `GZ-${Date.now().toString().slice(-6)}`;

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO orders (id, status, customer_first_name, customer_last_name, customer_phone, customer_address, customer_city, delivery_type, payment_method, subtotal, delivery_fee, total)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customer.firstName,
        customer.lastName || '',
        customer.phone,
        customer.address || '',
        customer.city || 'Karachi',
        delivery || 'standard',
        payment || 'cod',
        subtotal || 0,
        deliveryFee || 0,
        total || 0,
      ]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, is_custom, custom_details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.id || null,
          item.name,
          item.quantity,
          item.isCustom ? 0 : (item.price || 0),
          item.isCustom ? 1 : 0,
          item.customDetails ? JSON.stringify(item.customDetails) : null,
        ]
      );

      if (!item.isCustom && item.id) {
        await connection.query(
          'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?',
          [item.quantity, item.id]
        );
      }
    }

    await connection.commit();

    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const [orderItems] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    res.status(201).json(shapeOrder(orders[0], orderItems));
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Error creating order', error: error.message });
  } finally {
    connection.release();
  }
};

export const getOrders = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    const result = [];

    for (const order of orders) {
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      result.push(shapeOrder(order, items));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [result] = await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json(shapeOrder(orders[0], items));
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};
