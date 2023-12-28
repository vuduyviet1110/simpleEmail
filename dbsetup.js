require("dotenv").config();
const mysql = require("mysql2");

// Database connection configuration
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  multipleStatements: true,
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to the database");
});

const createTablesQuery = `
  -- Create users table
  CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_password VARCHAR(255) NOT NULL
  );

  -- Create emails table
  CREATE TABLE IF NOT EXISTS emails (
    email_id INT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    subject VARCHAR(255),
    message TEXT,
    timeReceived DATE NOT NULL,
    filename TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_by INT,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id),
    FOREIGN KEY (deleted_by) REFERENCES users(user_id)
  );
`;

const initDataQuery = `
-- Insert users
INSERT IGNORE INTO users (user_id, user_name, user_email, user_password) VALUES
  (1, 'User 1', 'a@a.com', 'password1'),
  (2, 'User 2', 'b@b.com', 'password2'),
  (3, 'User 3', 'c@c.com', 'password3'),
  (4, 'User 4', 'd@d.com', 'password4'),
  (5, 'User 5', 'e@e.com', 'password5');

-- Insert emails
INSERT IGNORE INTO emails (email_id, sender_id, receiver_id, subject, message, timeReceived,filename, is_deleted, deleted_by) VALUES
  (1, 1, 2, 'subject1', 'Message from user1 to user2', '2023-11-21 10:00:00','',false,null),
  (2, 2, 1, 'subject2', 'Message from user2 to user1', '2023-11-22 12:30:00','',false,null),
  (3, 3, 1, 'subject3', 'Message from user3 to user1', '2023-11-23 15:45:00','',false,null),
  (4, 4, 5, 'subject4', 'Message from user4 to user5', '2023-11-24 18:15:00','',false,null),
  (5, 5, 4, 'subject5', 'Message from user5 to user4', '2023-11-25 20:30:00','',false,null),
  (6, 1, 3, 'subject6', 'Message from user1 to user3', '2023-11-26 22:45:00','',false,null),
  (7, 3, 2, 'subject7', 'Message from user3 to user2', '2023-11-27 14:00:00','',false,null),
  (8, 2, 4, 'subject8', 'Message from user2 to user4', '2023-11-28 16:15:00','',false,null),
  (9, 4, 1, 'subject9', 'Message from user4 to user1', '2023-11-29 08:30:00','',false,null),
  (10, 5, 2, 'subject10', 'Message from user5 to user2', '2023-11-30 10:45:00','',false,null),
  (11, 1, 5, 'subject11', 'Message from user1 to user5', '2023-12-01 12:00:00','',false,null),
  (12, 2, 3, 'subject12', 'Message from user2 to user3', '2023-12-02 14:15:00','',false,null),
  (13, 3, 4, 'subject13', 'Message from user3 to user4', '2023-12-03 16:30:00','',false,null),
  (14, 4, 5, 'subject14', 'Message from user4 to user5', '2023-12-04 18:45:00','',false,null),
  (15, 5, 1, 'subject15', 'Message from user5 to user1', '2023-12-05 21:00:00','',false,null),
  (16, 1, 4, 'subject16', 'Message from user1 to user4', '2023-12-06 23:15:00','',false,null),
  (17, 2, 5, 'subject17', 'Message from user2 to user5', '2023-12-07 09:30:00','',false,null),
  (18, 3, 1, 'subject18', 'Message from user3 to user1', '2023-12-08 11:45:00','',false,null),
  (19, 4, 2, 'subject19', 'Message from user4 to user2', '2023-12-09 14:00:00','',false,null),
  (20, 5, 3, 'subject20', 'Message from user5 to user3', '2023-12-10 16:15:00','',false,null);
`;

connection.query(createTablesQuery, (err) => {
  if (err) {
    console.error("Error creating tables:", err.message);
    return;
  }
  connection.query(initDataQuery, (err) => {
    if (err) {
      console.error("Error initializing data:", err.message);
    } else {
      console.log("Data initialized successfully");
    }
  });
});

module.exports = connection;
