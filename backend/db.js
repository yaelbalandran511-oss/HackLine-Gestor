const { Pool } = require('pg');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
    }

    async query(text, params) {
        return this.pool.query(text, params);
    }

    async close() {
        return this.pool.end();
    }
}

module.exports = new Database();