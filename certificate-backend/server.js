const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// MySQL configuration - adjust with your database credentials
const dbConfig = {
  host: 'localhost',
  user: 'your_mysql_username',
  password: 'your_mysql_password',
  database: 'certificate_reservations',
};

// Helper function to get a database connection
async function getConnection() {
  const connection = await mysql.createConnection(dbConfig);
  return connection;
}

// Create the reservations table if it doesn't exist
async function initDb() {
  const connection = await getConnection();
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      certificate_type ENUM('COG', 'COR') NOT NULL,
      reservation_date DATE NOT NULL,
      reservation_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
  await connection.execute(createTableQuery);
  await connection.end();
}

// Initialize database table
initDb().catch(err => {
  console.error('Error initializing database:', err);
});

// Routes

// Get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM reservations ORDER BY created_at DESC');
    await connection.end();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new reservation
app.post('/api/reservations', async (req, res) => {
  try {
    const { fullName, email, certificateType, reservationDate, reservationTime } = req.body;

    if (!fullName || !email || !certificateType || !reservationDate || !reservationTime) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    if (!['COG', 'COR'].includes(certificateType)) {
      return res.status(400).json({ error: 'Invalid certificate type.' });
    }

    // Optional: additional validation like email format, date/time in future could be added here

    const connection = await getConnection();
    const insertQuery = `
      INSERT INTO reservations (full_name, email, certificate_type, reservation_date, reservation_time)
      VALUES (?, ?, ?, ?, ?);
    `;
    const [result] = await connection.execute(insertQuery, [
      fullName,
      email,
      certificateType,
      reservationDate,
      reservationTime,
    ]);
    await connection.end();

    res.status(201).json({ id: result.insertId, message: 'Reservation created successfully' });
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a reservation by ID
app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const connection = await getConnection();

    const [result] = await connection.execute('DELETE FROM reservations WHERE id = ?', [id]);
    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  } catch (err) {
    console.error('Error deleting reservation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

