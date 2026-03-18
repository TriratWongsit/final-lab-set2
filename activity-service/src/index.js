const express = require('express');
const app     = express();

app.use(express.json());

app.use('/api/activities', require('./routes/activity'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`activity-service running on port ${PORT}`));
