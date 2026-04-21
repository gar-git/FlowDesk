-- role_master
CREATE TABLE IF NOT EXISTS role_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(255) NOT NULL UNIQUE
);

INSERT IGNORE INTO role_master (id, role_name) VALUES
  (1, 'Manager'),
  (2, 'Team Lead'),
  (3, 'Developer'),
  (4, 'Admin');


-- companies table
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_code VARCHAR(20) NOT NULL UNIQUE,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL
);


-- users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,

  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,

  role_id INT NOT NULL,
  company_id INT NOT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,

  employee_code VARCHAR(100) NOT NULL,
  manager_id INT,
  tl_id INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,

  FOREIGN KEY (role_id) REFERENCES role_master(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tl_id) REFERENCES users(id) ON DELETE SET NULL
);


-- projects table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_id INT NOT NULL,
  created_by INT NOT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,

  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);


-- project members (assign users to projects)
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  added_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_project_user (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id)
);


-- tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- status: 1=todo, 2=ongoing, 3=completed
  status SMALLINT NOT NULL DEFAULT 1,

  project_id INT NOT NULL,
  creator_id INT,
  assignee_id INT,

  -- priority: 1=low, 2=medium, 3=high
  priority SMALLINT NOT NULL DEFAULT 2,

  due_date DATE,
  forward_from INT,
  pending_forward_to INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (forward_from) REFERENCES users(id),
  FOREIGN KEY (pending_forward_to) REFERENCES users(id)
);