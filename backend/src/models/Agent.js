const mongoose = require('mongoose');
const agentSchema = new mongoose.Schema({
  agentId: { type: String, unique: true, index: true },
  name: String, phone: String, active: { type: Boolean, default: true }
});
module.exports = mongoose.model('Agent', agentSchema);
