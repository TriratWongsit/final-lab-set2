const express = require('express');
const app     = express();

app.use(express.json());

app.use('/api/tasks', require('./routes/tasks'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`task-service running on port ${PORT}`));
