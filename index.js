const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000


app.use(express.json());
app.use(cors());


app.get('/', async (req, res) => {
    res.status(200).send('server is running');
});

app.listen(port, () => {
    console.log('listening on port http://localhost:%d', port);
});