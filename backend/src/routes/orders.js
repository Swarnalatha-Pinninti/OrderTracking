const router = require('express').Router();
const Order = require('../models/Order');

router.get('/', async (req, res) => {
  const orders = await Order.find({}).sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/:orderId', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ ok: false, message: 'Not found' });
  res.json(order);
});

router.post('/', async (req, res) => {
  try {
    const order = await Order.create(req.body);
    req.io.emit('order:created', order);
    res.json(order);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status }, $push: { statusHistory: { status, timestamp: new Date() } } },
      { new: true }
    );
    if (!order) return res.status(404).json({ ok: false, message: 'Not found' });
    req.io.to(`order-${order.orderId}`).emit('order:status', { orderId: order.orderId, status, time: new Date() });
    req.io.emit('order:status', { orderId: order.orderId, status, time: new Date() });
    res.json(order);
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.patch('/:id/assign', async (req, res) => {
  try {
    const { assignedAgentId } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: { assignedAgentId } }, { new: true });
    if (!order) return res.status(404).json({ ok: false, message: 'Not found' });
    req.io.emit('order:assigned', { orderId: order.orderId, agentId: assignedAgentId });
    res.json(order);
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/:orderId/verify-otp', async (req, res) => {
  const { otp } = req.body;
  const order = await Order.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).json({ ok: false });
  if (order.otp !== String(otp)) return res.status(401).json({ ok: false });
  order.status = 'Delivered';
  order.statusHistory.push({ status: 'Delivered', timestamp: new Date() });
  await order.save();
  req.io.to(`order-${order.orderId}`).emit('order:status', { orderId: order.orderId, status: 'Delivered', time: new Date() });
  req.io.emit('order:status', { orderId: order.orderId, status: 'Delivered', time: new Date() });
  res.json({ ok: true, order });
});

module.exports = router;
