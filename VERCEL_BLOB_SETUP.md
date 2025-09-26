# Vercel Blob Storage Setup Guide

## 🚀 **Quick Setup**

### **1. Get Vercel Blob Token**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Blob**
3. Create a new Blob store or use existing one
4. Copy the **Read/Write Token**

### **2. Add Environment Variable**
Add to your `.env.local` file:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### **3. Deploy to Vercel**
```bash
# Deploy your app
vercel deploy

# Or if using Vercel CLI
vercel env add BLOB_READ_WRITE_TOKEN
```

## 🔧 **Configuration Details**

### **Environment Variables**
- **`BLOB_READ_WRITE_TOKEN`**: Required for file uploads
- **`CONVEX_URL`**: Required for database operations
- **`CONVEX_SERVICE_TOKEN`**: Required for worker operations

### **File Limits**
- **Max file size**: 100MB
- **Supported formats**: HTML files only
- **Storage**: Public access (files are publicly accessible)

### **Security Notes**
- Files are stored with public access
- Consider adding authentication checks if needed
- File names are randomized to prevent conflicts

## 📁 **File Structure**

```
app/
├── api/
│   └── upload/
│       └── route.ts          # File upload endpoint
├── components/
│   └── import/
│       ├── FileUploadNew.tsx # Upload component
│       ├── FileStatus.tsx    # Status tracking
│       └── ImportPageNew.tsx # Import page
└── ...

convex/
├── files.ts                 # File management
├── fileProcessor.ts         # Background processing
└── schema.ts               # Database schema

apps/worker/src/
└── index.ts                # Worker with blob download
```

## 🔄 **Data Flow**

### **Upload Process**
1. User selects HTML file
2. File uploaded to Vercel Blob via `/api/upload`
3. File metadata stored in Convex
4. Background processing job enqueued

### **Processing Process**
1. Worker downloads file from Vercel Blob
2. HTML content parsed to extract video records
3. Records ingested into Convex database
4. Enrichment jobs enqueued for new videos

## 🧪 **Testing**

### **Local Development**
```bash
# Start development server
npm run dev

# Start worker (in separate terminal)
npm run worker:dev

# Test file upload
# 1. Go to http://localhost:3000
# 2. Upload a test HTML file
# 3. Check file status in UI
# 4. Monitor worker logs for processing
```

### **Production Testing**
1. Deploy to Vercel
2. Upload test file
3. Check Vercel Blob dashboard for stored files
4. Monitor processing in Convex dashboard

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"BLOB_READ_WRITE_TOKEN environment variable is required"**
- Ensure token is set in `.env.local`
- Restart development server
- Check token is valid in Vercel dashboard

#### **"Failed to download file from Vercel Blob"**
- Check file exists in Vercel Blob dashboard
- Verify storageRef is correct in database
- Check network connectivity

#### **"File too large"**
- Reduce file size below 100MB
- Consider compressing HTML file
- Check Vercel Blob limits

### **Debug Steps**
1. Check browser network tab for upload errors
2. Check worker logs for processing errors
3. Verify environment variables are set
4. Check Vercel Blob dashboard for file storage

## 📊 **Monitoring**

### **Vercel Blob Dashboard**
- View stored files
- Monitor storage usage
- Check access logs

### **Convex Dashboard**
- Monitor job queue
- Check processing status
- View error logs

### **Worker Logs**
- Processing progress
- Error details
- Performance metrics

## 🔒 **Security Considerations**

### **File Access**
- Files are publicly accessible
- Consider adding authentication if needed
- Monitor access patterns

### **Data Privacy**
- HTML files may contain sensitive data
- Consider encryption for sensitive content
- Implement proper access controls

### **Rate Limiting**
- Vercel Blob has usage limits
- Monitor upload frequency
- Implement rate limiting if needed

## 🎯 **Next Steps**

### **Production Readiness**
1. ✅ Set up Vercel Blob storage
2. ✅ Configure environment variables
3. ✅ Test file upload and processing
4. ✅ Monitor performance and errors

### **Optional Enhancements**
1. **File compression** before upload
2. **Progress tracking** during upload
3. **Batch processing** for multiple files
4. **File validation** before processing
5. **Error recovery** mechanisms

## 📞 **Support**

- **Vercel Blob Docs**: https://vercel.com/docs/storage/vercel-blob
- **Convex Docs**: https://docs.convex.dev
- **Issues**: Check GitHub issues for common problems
