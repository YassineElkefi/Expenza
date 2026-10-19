# Expenza

Expenza is a personal finance app built with Next.js and MongoDB. Email/password accounts are stored in MongoDB; sessions use signed JWTs in HttpOnly cookies.

## Local setup

Create `.env.local` with your MongoDB connection string and a unique JWT signing secret:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/
JWT_SECRET=<random-secret-at-least-32-bytes>
```

Generate a secret, for example, with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Keep the value private and use the same value across app instances.

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). New users can register at `/login`; passwords are stored as scrypt hashes and sessions expire after seven days.

Existing Supabase users and finance records are not migrated automatically. Users need to register again, and any existing finance data must be imported into the MongoDB collections before it appears in Expenza.
