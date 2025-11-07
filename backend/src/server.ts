import { configDotenv } from 'dotenv';
import express from 'express';
configDotenv();

const app = express();
const PORT = process.env.PORT || 3000;


app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});