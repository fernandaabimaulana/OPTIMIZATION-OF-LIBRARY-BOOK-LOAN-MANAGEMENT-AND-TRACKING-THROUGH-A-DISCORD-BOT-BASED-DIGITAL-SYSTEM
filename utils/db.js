/*
================================================================================
File: 📁 smanung-library-bot/utils/db.js (Koneksi Database)
Tujuan: Mengelola koneksi ke database MySQL.
================================================================================
*/
const mysql = require('mysql2');
require('dotenv').config();

// Membuat pool koneksi agar lebih efisien
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cek koneksi saat pertama kali dijalankan
pool.getConnection((err, connection) => {
    if (err) {
        console.error('[DATABASE ERROR] Gagal terhubung ke database:', err.message);
        return;
    }
    if (connection) {
        console.log('[DATABASE] Berhasil terhubung ke database MySQL.');
        connection.release(); // Melepas koneksi setelah selesai cek
    }
});

// Ekspor promise pool agar bisa digunakan di file lain dengan async/await
module.exports = pool.promise();
