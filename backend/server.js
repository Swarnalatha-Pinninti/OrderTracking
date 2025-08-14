require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PATCH'] }
});

app.use((req, res, next) => { req.io = io; next(); });
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delivery_tracker';
mongoose.connect(MONGO_URI).then(()=> console.log('Mongo connected')).catch(err=> console.error('Mongo error', err));

app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/agents', require('./src/routes/agents'));

io.on('connection', (socket) => {
  socket.on('track:join', (orderId) => socket.join(`order-${orderId}`));
  socket.on('agent:join', (agentId) => socket.join(`agent-${agentId}`));
  socket.on('agent:location', (payload) => {
    if (payload.orderId) io.to(`order-${payload.orderId}`).emit('order:agent_location', payload);
    io.emit('agent:location', payload);
  });
  socket.on('agent:status', async (payload) => {
    try {
      const Order = require('./src/models/Order');
      await Order.findOneAndUpdate(
        { orderId: payload.orderId },
        { status: payload.status, updatedAt: new Date() }
      );
      io.emit('order:status', payload);

      if (payload.orderId) {
        io.to(`order-${payload.orderId}`).emit('order:status', payload);
      }

      console.log(`Order ${payload.orderId} updated to status: ${payload.status}`);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});


app.get('/api/health', (_, res)=> res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, ()=> console.log('API listening on :' + PORT));
