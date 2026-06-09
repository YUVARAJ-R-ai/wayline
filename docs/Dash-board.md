## Quick Deployment Steps

### 1. **Create these files in your Next.js project:**

1. **Create folders:** `components/`, `lib/`, `app/api/auth/[...nextauth]/`
2. **Copy the code** from the artifacts above into the respective files
3. **Copy the auth.ts, dashboard layout, login page, and API keys page** from my previous artifacts

### 2. **Set up environment variables in Vercel:**

1. Go to your Vercel dashboard
2. Find your project → Settings → Environment Variables
3. Add:
    - `NEXTAUTH_URL`: Your Vercel deployment URL
    - `NEXTAUTH_SECRET`: Generate a random string (use: `openssl rand -base64 32`)
    - For now, you can use dummy values for database URLs

### 3. **Quick Test Structure:**

Create this minimal file structure:

```
your-nextjs-project/
├── app/
│   ├── api/auth/[...nextauth]/route.ts
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── keys/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/providers.tsx
├── lib/auth.ts
└── .env.local
```

### 4. **For your meeting demo:**

The app will work with:

- **Mock authentication** (hardcoded user: `admin@wayline.com` / `password123`)
- **Sample dashboard data**
- **Fake API keys** for demonstration
- **Beautiful UI** that shows your vision

Would you like me to create a quick setup script or provide more specific guidance on any of these files?