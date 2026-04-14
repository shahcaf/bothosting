CREATE DATABASE IF NOT EXISTS discord_hosting;
USE discord_hosting;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT current_timestamp()
);

CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'stopped', -- 'running', 'stopped', 'error'
    main_file VARCHAR(255) DEFAULT 'index.js',
    created_at TIMESTAMP DEFAULT current_timestamp()
);

CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    log_text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT current_timestamp()
);
