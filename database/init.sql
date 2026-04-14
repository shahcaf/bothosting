-- CockroachDB SQL initialization

CREATE DATABASE IF NOT EXISTS discord_hosting;
USE discord_hosting;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id STRING UNIQUE NOT NULL,
    username STRING NOT NULL,
    discriminator STRING,
    avatar STRING,
    role STRING DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name STRING NOT NULL,
    status STRING DEFAULT 'offline', -- 'online', 'offline', 'starting', 'crashing', 'error'
    ram_limit INTEGER DEFAULT 512, -- in MB
    cpu_limit FLOAT DEFAULT 0.5, -- percentage (0.5 = 50%)
    container_id STRING,
    bot_token STRING,
    entry_file STRING DEFAULT 'index.js',
    path STRING NOT NULL, -- local folder path or zip path
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    message STRING NOT NULL,
    timestamp TIMESTAMP DEFAULT now()
);
