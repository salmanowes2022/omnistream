# Quick Start (30 seconds)

## Backend Only

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npx prisma generate && npx prisma migrate dev --name init

# 3. Start backend server
npm run dev
```

**Done!** Open <http://localhost:3000>

## Optional: Add Web Dashboard

In a **second terminal**:

```bash
cd examples/web-dashboard
npm install
npm start
```

Then open <http://localhost:4000> for the full dashboard UI!

## First Login

1. Click **Register**
2. Enter: Name, Email, Password
3. You're in! 🎉

## The Auth Page Now Looks Like This

- ✨ Clean centered card
- 🎨 Purple gradient header (#6C63FF)
- 📱 Modern tabs (Login / Register)
- ⚡ Smooth animations
- 🔒 Secure JWT auth
- ➡️ Auto-redirect to dashboard

**No more Community ID legacy stuff!**

---

Need more details? See [INSTALLATION.md](./INSTALLATION.md)
