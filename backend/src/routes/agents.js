const router = require('express').Router();
const Agent = require('../models/Agent');

router.get('/', async (req, res) => {
  let agents = await Agent.find({ active: true }).select('-__v');
  if (agents.length === 0) {
    agents = await Agent.insertMany([
      { agentId: 'agent_1001', name: 'Alice', phone: '9999990001' },
      { agentId: 'agent_1002', name: 'Bob', phone: '9999990002' },
      { agentId: 'agent_1003', name: 'Charlie', phone: '9999990003' }
    ]);
  }
  res.json(agents);
});

module.exports = router;
