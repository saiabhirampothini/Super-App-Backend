const mysql = require("mysql2");
// Create a connection to the database
const rds_connection = mysql.createConnection({
  host: process.env.RDS_ENDPOINT,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  // database: process.env.RDS_DATABASE_NAME,
});

// Connect to the database
rds_connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database as id " + rds_connection.threadId);
});

//Create Database if doesn't exists
let databaseQuery = "CREATE DATABASE IF NOT EXISTS X;";
rds_connection.query(databaseQuery, (err, results, fields) => {
  if (err) {
    console.error("Error executing query:", err);
    return;
  }
  console.log("Query results:", results);
});
const databaseQuery2 = "USE X;";
rds_connection.query(databaseQuery2, (err, results, fields) => {
  if (err) {
    console.error("Error executing query:", err);
    return;
  }
  console.log("Query results:", results);
});

module.exports = rds_connection;
