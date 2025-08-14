const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const statusEnum = [
  'Scheduled','Reached Store','Picked Up','Out for Delivery','Delivered','Cancelled'
];

const orderSchema = new mongoose.Schema({
  orderId: { type: String, default: ()=> uuidv4().split('-')[0], unique: true, index: true },
  customer: { name: String, phone: String, address: String, lat: Number, lng: Number },
  items: [{ name: String, qty: Number }],
  preferredTime: String,
  status: { type: String, enum: statusEnum, default: 'Scheduled' },
  statusHistory: [{ status: { type: String, enum: statusEnum }, timestamp: { type: Date, default: Date.now } }],
  assignedAgentId: { type: String, default: null, index: true },
  otp: { type: String, default: () => Math.floor(1000 + Math.random()*9000).toString() },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  storeLocation: { lat: Number, lng: Number }
});

orderSchema.pre('save', function(next){
  if (this.isNew) this.statusHistory.push({ status: this.status });
  this.updatedAt = new Date();
  next();
});

orderSchema.pre('findOneAndUpdate', function(next){
  const update = this.getUpdate() || {};
  if (update.status) {
    this.updateOne({ $push: { statusHistory: { status: update.status, timestamp: new Date() } }, $set: { updatedAt: new Date() } });
  } else {
    this.updateOne({ $set: { updatedAt: new Date() } });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
