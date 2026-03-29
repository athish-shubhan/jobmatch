# JobMatch

A skill-based job matching platform built with React, Express.js, and MySQL.

---

## Stack

- **Frontend** — React + Vite (`/jobmatch`)
- **Backend** — Node.js + Express (`server.js`)
- **Database** — MySQL 8.0 (`schema.sql`)
- **AI** — Gemini 2.5 Flash

---

## Setup

### 1. Database
```bash
mysql -u root -p < schema.sql
```

### 2. Backend
```bash
npm install
node server.js
```
> Runs on http://localhost:5001

Open `server.js` and fill in your MySQL password on line 26:
```js
password: "your_mysql_password",
```

### 3. Frontend
```bash
cd jobmatch
npm install
npm run dev
```
> Runs on http://localhost:5173

Open `jobmatch/src/App.jsx` and fill in your free Gemini API key on line 6:
```js
const GEMINI_API_KEY = "your_key_here";
```
Get one at: https://aistudio.google.com/app/apikey

---

## Login Credentials

| Role | Email / Username | Password |
|------|-----------------|----------|
| Applicant | alice@email.com | pass123 |
| Employer | hr@techcorp.com | hr123 |
| DBA Admin | db_admin | admin123 |
| DBA Viewer | db_viewer | view123 |
| DBA Editor | db_editor | edit123 |
