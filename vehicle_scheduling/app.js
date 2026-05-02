const express = require('express');
const logger = require('./logging_middleware/logger');
const scheduler = require('./vehicle_scheduler/scheduler');

const app = express();
let port = 3000;

app.use(logger);

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/schedule', async (req, res) => {
  try {
    const result = await scheduler.getSchedule();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get schedule', message: error.message });
  }
});

const startServer = () => {
  const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying port ${port + 1}`);
      port = port + 1;
      startServer();
    } else {
      console.error('Server error:', err);
    }
  });
};

startServer();

module.exports = app;
