# SEO Audit Tool

A serverless SEO analysis tool built for Vercel.

## API Endpoints

- `GET /api/seo-check?url=example.com&keyword=optional` - Comprehensive SEO analysis
- `GET /api/full-audit?url=example.com&keyword=optional` - Full audit with all checks
- `GET /api/privacy` - Privacy policy

## Local Development

```bash
npm install
vercel dev
```

## Deployment

Automatically deploys to Vercel when pushed to main branch.