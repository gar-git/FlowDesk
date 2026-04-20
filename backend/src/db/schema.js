import { mysqlTable, int, varchar, text, smallint, date, timestamp, tinyint } from 'drizzle-orm/mysql-core';

// Role Master
export const roleMaster = mysqlTable('role_master', {
    id: int('id').autoincrement().primaryKey(),
    roleName: varchar('role_name', { length: 255 }).notNull().unique(),
});

// Companies
export const companies = mysqlTable('companies', {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    companyCode: varchar('company_code', { length: 20 }).notNull().unique(),
    isDeleted: tinyint('is_deleted').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

// Users
export const users = mysqlTable('users', {
    id: int('id').autoincrement().primaryKey(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    roleId: int('role_id').notNull().references(() => roleMaster.id),
    companyId: int('company_id').notNull().references(() => companies.id),
    isDeleted: tinyint('is_deleted').notNull().default(0),
    employeeCode: varchar('employee_code', { length: 100 }).notNull(),
    managerId: int('manager_id').references(() => users.id),
    tlId: int('tl_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

// Projects
export const projects = mysqlTable('projects', {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    companyId: int('company_id').notNull().references(() => companies.id),
    createdBy: int('created_by').notNull().references(() => users.id),
    isDeleted: tinyint('is_deleted').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

// Tasks
export const tasks = mysqlTable('tasks', {
    id: int('id').autoincrement().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    // 1=todo, 2=ongoing, 3=completed
    status: smallint('status').notNull().default(1),
    projectId: int('project_id').notNull().references(() => projects.id),
    creatorId: int('creator_id').references(() => users.id),
    assigneeId: int('assignee_id').references(() => users.id),
    // 1=low, 2=medium, 3=high
    priority: smallint('priority').notNull().default(2),
    dueDate: date('due_date'),
    forwardFrom: int('forward_from').references(() => users.id),
    pendingForwardTo: int('pending_forward_to').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});