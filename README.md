# FlowDesk Task Tracker

## Summary

Full-stack task tracker with role hierarchy: Manager → TL → Developer.
- Login/signup with JWT
- Task CRUD + status
- Task forward with accept
- Real-time in-app notification via Socket.IO
- Redis + BullMQ message queue for notifications
- PostgreSQL DB

## Backend

1. cd backend
2. cp .env.example .env
3. Setup Postgres DB and update DATABASE_URL
4. psql -f db-init.sql
5. npm install
6. npm run dev

## Frontend

1. cd frontend
2. npm install
3. npm run dev (on port 3000)

## Default flow

1. Signup or seed users
2. Login, use actions
3. Create/forward/accept tasks
4. Manager/TL can view team via /api/users/team
5. Use notifications all across

## Architecture

- Express + Socket.IO + JWT
- BullMQ + Redis queue for notifications
- PostgreSQL user/task hierarchy
- React + Vite app for cards + modals

## Notes

- Add role-based route guard for production
- Add proper validation
- Add file uploader if needed
- Add export/week-month reports (use node-xlsx or json2csv)
