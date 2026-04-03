import { pgTable, serial, text, integer, smallint, date, timestamp } from 'drizzle-orm/pg-core';

export const roleMaster = pgTable('role_master', {
    id: serial('id').primaryKey(),
    roleName: text('role_name').notNull().unique(),
});

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    roleId: integer('role_id').notNull().references(() => roleMaster.id),
    employeeCode: text('employee_code').notNull().unique(),
    managerId: integer('manager_id').references(() => users.id),
    tlId: integer('tl_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    // 1=todo, 2=ongoing, 3=completed
    status: smallint('status').notNull().default(1),
    creatorId: integer('creator_id').references(() => users.id),
    assigneeId: integer('assignee_id').references(() => users.id),
    // 1=low, 2=medium, 3=high
    priority: smallint('priority').notNull().default(2),
    dueDate: date('due_date'),
    forwardFrom: integer('forward_from').references(() => users.id),
    pendingForwardTo: integer('pending_forward_to').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});