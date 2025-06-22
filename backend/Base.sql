CREATE DATABASE atalesdb;
CREATE USER 'juan'@'localhost' IDENTIFIED BY '1234';
GRANT ALL PRIVILEGES ON atalesdb.* TO 'juan'@'localhost';
FLUSH PRIVILEGES;