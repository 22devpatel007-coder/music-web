const express = require('express');
const cors = require('cors');
require('dotenv').config();
const errorHandler = require('./utils/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/songs', require('./routes/songs.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/users', require('./routes/users.routes'));

// Global error handler — MUST be after all routes
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));