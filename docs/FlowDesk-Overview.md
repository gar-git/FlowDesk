# FlowDesk — Product overview

This document explains **what FlowDesk is**, **who uses it**, **what you can do with it**, and **how the system works** at a high level. You can share it with stakeholders, new teammates, or anyone evaluating the product.

---

## What is FlowDesk?

FlowDesk is a **team task and workspace application** for organizations that work in **projects** and **reporting lines**. Companies onboard onto FlowDesk with an admin account; employees join using a **company code**. Inside the app, people manage **projects**, **tasks**, and **organizational hierarchy** (who reports to whom), all within their company—data is scoped so users only see what belongs to their organization.

It is designed for scenarios such as:

- Managers and tech leads **creating and assigning work** to developers.
- Developers **tracking assigned tasks** on a board (status, priority, dates, tags, task type).
- Admins **inviting users** and maintaining **projects** and membership.
- Everyone adjusting **personal settings** (theme, email preferences, password).

---

## Who uses it? (Roles)

FlowDesk uses fixed **role types** (stored in the database and reflected in the UI):

| Role           | Typical responsibilities |
|----------------|---------------------------|
| **Administrator** | Company setup, creating users, organization hierarchy views, projects. |
| **Manager**       | Team oversight, organization assignments, projects, personal task board. |
| **Tech Lead**     | Team-focused workflows, assigning tasks to developers (within scope), personal board. |
| **Developer**     | Own task board; tasks assigned by leads/managers or self-created where allowed. |

Permissions differ by role—for example, only certain roles can create users or edit full hierarchy; **developers** can generally only assign new tasks to themselves, while **tech leads** and **managers** can assign to people they manage (according to backend rules).

---

## Core usage (what people actually do)

### Tasks

- **Board**: Users see tasks **assigned to them** on a Kanban-style board (e.g. To do / Ongoing / Done).
- **Create task**: Title, description, project, assignee (where permitted), priority, optional **start** and **due** dates, tags, and task type (bug, feature, improvement, chore).
- **Task detail**: Edit title, description, status, tags, type; rules vary:
  - **Due date** can typically be changed only by the **person who created** the task (e.g. lead sets deadline; junior adjusts **start date** but not due date).
  - **Priority** and **assignee** changes are reserved for the **creator** when those restrictions apply.
- **Forward**: Assignees can **forward** a task to a teammate (with an accept flow where implemented).
- **Delete**: Only the **creator** can delete a task (when creator is recorded).

### Projects

- Projects belong to the **company**.
- **Members** can be added so tasks can be tied to the right project context.

### Organization

- **Hierarchy**: Managers can maintain reporting relationships (manager / tech lead links) for users in the company.
- **Roster / tree views** help visualize structure.

### Settings (per user)

- **Appearance**: Dark / light theme (stored in the browser).
- **Notifications**: Email toggles (e.g. task assigned); preferences can be stored per user when the corresponding migration is applied.
- **Security**: Change password (authenticated API).

### Real-time and email

- When **Redis** and the **notification worker** are running, **Socket.IO** can push **in-app notifications** (e.g. when someone is assigned a task) so boards can refresh without reloading.
- If **SMTP** is configured, users may receive **assignment emails** (respecting their “task assigned” preference where implemented).

---

## How FlowDesk works (architecture, simplified)

FlowDesk is a **web application** split into a **frontend** and **backend**, talking over **HTTPS** (REST APIs) and optionally **WebSockets**.

### Frontend

- **React** (Vite), **React Router**, **Axios** for API calls.
- **socket.io-client** connects to the backend for live notifications when enabled.
- Themes use CSS variables (`light` / `dark`) applied via `data-theme` on the document root.

### Backend

- **Node.js** with **Express**.
- **JWT** authentication; passwords hashed with **bcrypt**.
- **MySQL** database via **Drizzle ORM** (schema in code + SQL migrations in `backend/migrations/`).
- **BullMQ** + **Redis** for background jobs (notifications, optional email).
- **Socket.IO** server attached to the same HTTP server as the API for push-style alerts.
- **Nodemailer** for outbound email when SMTP environment variables are set.

### Typical request flow

1. User logs in → receives a **JWT** stored client-side (e.g. localStorage) and sent on API requests.
2. Dashboard loads **tasks assigned to the current user**, **projects**, and **company/profile** data from REST endpoints.
3. Creating or updating a task hits **`/api/tasks`** (and related routes); the server enforces **company scope** and **role rules**.
4. Assignment events may enqueue a **notification job**; the worker delivers **socket messages** and optionally **email**.

### What you need to run it locally (conceptually)

- **MySQL** with schema/migrations applied.
- **Backend** `.env`: database URL, JWT secret, port; **Redis** URL if you want queues and live notifications.
- **Frontend** `.env`: API base URL pointing at the backend (e.g. `VITE_FRONTEND_API_URL`).
- **SMTP** variables optional (without them, assignment emails are skipped; in-app/socket behavior still depends on Redis/worker for queued paths).

---

## Summary

| Question | Answer |
|----------|--------|
| **What is it?** | A company-scoped workspace for projects, tasks, hierarchy, and personal settings. |
| **Who is it for?** | Admins, managers, tech leads, and developers in one organization. |
| **Main usage** | Assign and track tasks on a board; manage projects and org structure; configure theme and notifications. |
| **How does it work?** | React SPA + Express API + MySQL; Redis/BullMQ + Socket.IO + optional SMTP for notifications and email. |

---

*This overview reflects the application’s intended behavior and architecture. Exact URLs, env variable names, and deployment steps live in the repository’s `README`, `env.example`, and migration files.*
