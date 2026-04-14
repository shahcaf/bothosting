require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/bots', require('./routes/botRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(\`Server started on port \${PORT}\`));
