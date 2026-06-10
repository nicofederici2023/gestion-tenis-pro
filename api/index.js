const express = require('express');
const cors = require('cors');

// Load environment variables
require('dotenv').config({ path: './backend/.env' });

const authRoutes = require('./backend/src/routes/auth.routes');
const groupsRoutes = require('./backend/src/routes/groups.routes');
const notificationsRoutes = require('./backend/src/routes/notifications.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Root route
app.get('/api', (req, res) => {
  res.send('Shared Expenses API is running');
});

module.exports = app;
