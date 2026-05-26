const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const groupsRoutes = require('./routes/groups.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Shared Expenses API is running');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
