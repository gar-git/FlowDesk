-- role_master
CREATE TABLE IF NOT EXISTS role_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(255) NOT NULL UNIQUE
);

INSERT IGNORE INTO role_master (id, role_name) VALUES
  (1, 'Manager'),
  (2, 'Team Lead'),
  (3, 'Developer');


-- users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,

  role_id INT NOT NULL,

  employee_code VARCHAR(100),
  manager_id INT,
  tl_id INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (role_id) REFERENCES role_master(id),
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tl_id) REFERENCES users(id) ON DELETE SET NULL
);


-- tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- status: 1=todo, 2=ongoing, 3=completed
  status SMALLINT NOT NULL DEFAULT 1,

  creator_id INT,
  assignee_id INT,

  -- priority: 1=low, 2=medium, 3=high
  priority SMALLINT NOT NULL DEFAULT 2,

  due_date DATE,
  forward_from INT,
  pending_forward_to INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (forward_from) REFERENCES users(id),
  FOREIGN KEY (pending_forward_to) REFERENCES users(id)
);