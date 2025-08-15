# YouTube Analytics Platform - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Google Cloud Console Setup**: 
   - Create a project at [console.cloud.google.com](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials

## Environment Variables Setup

### Required Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Local Development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "OAuth 2.0 Client ID"
4. Configure authorized origins:
   - `http://localhost:3000` (development)
   - `https://your-app.vercel.app` (production)
5. Configure authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)

## Vercel Deployment

### Method 1: Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Navigate to project directory:
   ```bash
   cd youtube-analytics
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables:
   ```bash
   vercel env add NEXTAUTH_SECRET
   vercel env add GOOGLE_CLIENT_ID
   vercel env add GOOGLE_CLIENT_SECRET
   vercel env add NEXTAUTH_URL
   ```

### Method 2: GitHub Integration

1. Push your code to GitHub
2. Connect repository to Vercel:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." > "Project"
   - Import your GitHub repository
   - Configure environment variables in the deployment settings

### Environment Variables in Vercel Dashboard

Add these in Project Settings > Environment Variables:

- `NEXTAUTH_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET`: Generate using: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

## Build Configuration

The project includes optimized build settings in `next.config.js`:

```javascript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Ignore linting during build
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TS errors during build  
  },
  experimental: {
    webpackBuildWorker: true, // Faster builds
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false, // Required for client-side compatibility
      };
    }
    return config;
  },
}
```

## Vercel-Specific Configuration

The `vercel.json` file includes:

- **Function Timeouts**: Extended to 30 seconds for file processing
- **Build Settings**: Optimized for Next.js
- **Environment Variable References**: Linked to Vercel secrets
- **Regional Deployment**: Configured for `iad1` region

## Post-Deployment Steps

1. **Test Authentication**: Verify Google OAuth is working
2. **Upload Test File**: Test the file upload and parsing functionality
3. **Check Analytics**: Ensure all dashboard components render correctly
4. **Verify Performance**: Test with larger files to ensure proper processing

## Troubleshooting

### Common Issues

1. **OAuth Errors**: 
   - Verify redirect URIs in Google Cloud Console
   - Ensure `NEXTAUTH_URL` matches your Vercel domain

2. **Build Failures**:
   - Check environment variables are set correctly
   - Verify TypeScript/ESLint errors don't prevent builds

3. **File Upload Issues**:
   - Large files may timeout (current limit: 30 seconds)
   - Consider chunked processing for very large datasets

4. **Performance Issues**:
   - Monitor function execution times
   - Consider upgrading Vercel plan for higher limits

### Debug Mode

Enable debug logging by adding to environment variables:
```bash
NEXTAUTH_DEBUG=true
```

## Domain Configuration

### Custom Domain (Optional)

1. Add custom domain in Vercel dashboard
2. Update `NEXTAUTH_URL` to your custom domain
3. Update Google OAuth redirect URIs

### SSL Certificate

Vercel automatically provides SSL certificates for all deployments.

## Monitoring

- Monitor function execution in Vercel dashboard
- Check error logs for any runtime issues
- Monitor performance with Vercel Analytics (if enabled)

## Security Considerations

- Never commit `.env.local` to version control
- Use strong, unique `NEXTAUTH_SECRET`
- Regularly rotate Google OAuth credentials
- Monitor access logs for unusual activity

## Support

For deployment issues:
- Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Review NextAuth.js documentation: [next-auth.js.org](https://next-auth.js.org)
- Check project logs in Vercel dashboard