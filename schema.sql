-- Database Schema for Client Portal
-- Compatible with MariaDB / MySQL

CREATE DATABASE IF NOT EXISTS client_portal;
USE client_portal;

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    address TEXT,
    homes_count INT DEFAULT 0,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    manager VARCHAR(100),
    available_option_ids LONGTEXT, -- JSON array
    additional_photos LONGTEXT,    -- JSON array
    internal_remarks TEXT,
    delivery_date VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_password_set BOOLEAN DEFAULT FALSE,
    project_id VARCHAR(50),
    apartment_id VARCHAR(50),
    master_package_id VARCHAR(50),
    apartment_details LONGTEXT,    -- JSON object
    construction_progress LONGTEXT, -- JSON object
    dossier_number VARCHAR(100),
    remarks TEXT,
    exceptions LONGTEXT,           -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (project_id),
    INDEX (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Master Packages Table
CREATE TABLE IF NOT EXISTS master_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_id VARCHAR(50),
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(100),
    inclusions LONGTEXT,           -- JSON array
    photos LONGTEXT,               -- JSON array
    option_ids LONGTEXT,           -- JSON array
    INDEX (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50),
    customer_id VARCHAR(50),
    sender_id VARCHAR(50),
    sender_name VARCHAR(255),
    role VARCHAR(50),
    text TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(100),
    is_escalated BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    INDEX (customer_id),
    INDEX (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    text TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Portal Documents Table
CREATE TABLE IF NOT EXISTS portal_documents (
    id VARCHAR(50) PRIMARY KEY,
    project_id VARCHAR(50),
    customer_id VARCHAR(50),
    file_name VARCHAR(255),
    uploaded_by VARCHAR(255),
    role VARCHAR(50),
    date VARCHAR(50),
    size VARCHAR(50),
    external_url LONGTEXT,
    INDEX (customer_id),
    INDEX (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
