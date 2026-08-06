CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    google_access_token TEXT,
    google_refresh_token TEXT
);

CREATE TABLE IF NOT EXISTS halaqoh_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    group_name VARCHAR(255),
    member_name VARCHAR(255),
    attendance_status VARCHAR(50),
    date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ustadz (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    origin VARCHAR(255),
    address TEXT,
    phone VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS halaqoh_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ustadz_id INT,
    FOREIGN KEY (ustadz_id) REFERENCES ustadz(id)
);

CREATE TABLE IF NOT EXISTS group_students (
    group_id INT,
    student_id INT,
    PRIMARY KEY (group_id, student_id),
    FOREIGN KEY (group_id) REFERENCES halaqoh_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
