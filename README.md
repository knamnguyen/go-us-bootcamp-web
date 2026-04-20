# Go-US Entrepreneur Bootcamp Website

Landing page for the Go-US Entrepreneur Bootcamp. Built as a static site deployed on Cloudflare Pages with serverless functions.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- A [Cloudflare](https://dash.cloudflare.com/) account

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .dev.vars
   ```

   Edit `.dev.vars` and fill in your `OPENROUTER_API_KEY` (get one at [openrouter.ai/keys](https://openrouter.ai/keys)).

3. **Create a Cloudflare KV namespace:**

   ```bash
   npx wrangler kv namespace create SOCIAL_POSTS
   ```

   Copy the output `id` and update it in `wrangler.toml`:

   ```toml
   [[kv_namespaces]]
   binding = "SOCIAL_POSTS"
   id = "your-namespace-id-here"
   ```

4. **Run locally:**

   ```bash
   pnpm dev
   ```

## Deploying

1. **Authenticate with Cloudflare:**

   ```bash
   npx wrangler login
   ```

2. **Create your Pages project** (first time only):

   ```bash
   npx wrangler pages project create go-us-bootcamp
   ```

3. **Set production secrets:**

   ```bash
   npx wrangler pages secret put OPENROUTER_API_KEY
   ```

   Paste your API key when prompted.

4. **Deploy:**

   ```bash
   pnpm deploy
   ```

## Custom Domain

To use a custom domain, go to **Cloudflare Dashboard > Pages > go-us-bootcamp > Custom domains** and add your domain. Make sure your domain's DNS is managed by Cloudflare.

Update the `SHARE_URL` in `functions/generate-caption.js` to match your domain.

## Project Structure

```
├── index.html              # Main landing page
├── functions/              # Cloudflare Pages Functions (serverless)
│   ├── generate-caption.js # AI social share caption generator (OpenRouter)
│   └── api/
│       ├── posts.js        # List social posts from KV
│       ├── submit.js       # Submit social posts to KV
│       └── proxy-image.js  # Proxy social media images
├── assets/                 # Images and static assets
├── wrangler.toml           # Cloudflare Pages config
└── .dev.vars               # Local environment secrets (not committed)
```

## Third-Party Services

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| [OpenRouter](https://openrouter.ai/) | AI caption generation | `.dev.vars` / Cloudflare secret |
| [Cloudflare KV](https://developers.cloudflare.com/kv/) | Social post storage | `wrangler.toml` |
| [Google Analytics](https://analytics.google.com/) | Analytics (ID: `G-NX0JX4VL8D`) | `index.html` |
| [Loops.so](https://loops.so/) | Email newsletter signup | `index.html` |
| [Lu.ma](https://lu.ma/) | Event registration | `index.html` (external link) |
