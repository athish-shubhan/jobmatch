# JobMatch

A skill-based job matching platform built with React, Express.js, and MySQL.

---

## Technical Stack

- **Frontend**: React + Vite (Modular architecture)
- **Backend**: Node.js + Express
- **Database**: MySQL 8.0 (Views & Stored Procedures)
- **AI**: Gemini 2.5 Flash (via Secure Backend Proxy)

---

## Setup & Configuration

### 1. Database
Import the schema into your MySQL instance:
```bash
mysql -u root -p < schema.sql
```

### 2. Backend Environment
Create a `.env` file in the root directory:
```env
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Execution
**Run Backend:**
```bash
npm install
node server.js
```

**Run Frontend:**
```bash
cd jobmatch
npm install
npm run dev
```

---

## Improvements Made

1.  **Security**: Gemini API requests are now proxied through the backend. The API key is never exposed to the client.
2.  **Modularity**: Refactored the monolithic `App.jsx` into a component-based structure in `src/components/` and `src/pages/`.
3.  **Clean Code**: Secrets and configurations are moved to environment variables for better safety and portability.
