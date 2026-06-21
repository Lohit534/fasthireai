# GitHub Repository Secrets Documentation

To configure CI/CD deployments and build validation for FastHire-AI, configure the following secrets inside your GitHub repository settings under **Settings -> Secrets and variables -> Actions**.

## Required Action Secrets

### 1. Vercel Deployment Secrets
- **`VERCEL_TOKEN`**: Generate this Token on [vercel.com](https://vercel.com) under **Account Settings -> Tokens**.
- **`VERCEL_ORG_ID`**: Find this ID in your Vercel organization dashboard under **Settings -> General** (referenced as Team ID / Account ID).
- **`VERCEL_PROJECT_ID`**: Find this ID in your Next.js application dashboard under **Project Settings -> General**.

### 2. HuggingFace Space Secrets
- **`HF_TOKEN`**: Generate a **Write** access token on [huggingface.co](https://huggingface.co) under **Settings -> Access Tokens**.

---

## Vercel Project Environment Variables

The following environment variables (defined inside `frontend/.env.example`) must be set directly inside the **Vercel Project Dashboard** under **Settings -> Environment Variables** to enable production functionality:

```env
# Database + Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
HF_AI_API_URL=https://your-hf-space-url.hf.space

# App Config
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=FastHire-AI

# Payment Configurations (V2)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```
