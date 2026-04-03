-- role_master
CREATE TABLE IF NOT EXISTS role_master (
  id SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);
INSERT INTO role_master (id, role_name) VALUES
  (1, 'Manager'),
  (2, 'Team Lead'),
  (3, 'Developer')
ON CONFLICT (id) DO NOTHING;

--  users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,

  role_id INTEGER NOT NULL REFERENCES role_master(id),

  employee_code TEXT,
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tl_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,

  -- status: 1=todo, 2=ongoing, 3=completed
  status SMALLINT NOT NULL DEFAULT 1 CHECK (status IN (1,2,3)),

  creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- priority: 1=low, 2=medium, 3=high
  priority SMALLINT NOT NULL DEFAULT 2 CHECK (priority IN (1,2,3)),

  due_date DATE,
  forward_from INTEGER REFERENCES users(id),
  pending_forward_to INTEGER REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN tasks.status IS 
'1=todo, 2=ongoing, 3=completed';

COMMENT ON COLUMN tasks.priority IS 
'1=low, 2=medium, 3=high';
