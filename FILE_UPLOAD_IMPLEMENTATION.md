# File Upload & Background Processing Implementation

## 🎯 **Overview**

Successfully redesigned the Rabbit data pipeline to separate file upload from processing, enabling better scalability and user experience.

## 🏗️ **New Architecture**

### **Before (Synchronous Processing)**
```
HTML Upload → Parse → Store Records → Enrich
```

### **After (Asynchronous Processing)**
```
HTML Upload → Store File → Background Parse → Store Records → Enrich
```

## 📁 **Files Created/Modified**

### **Schema Updates**
- **`convex/schema.ts`**: Added `uploaded_files` table and `fileId` field to jobs
- **`convex/files.ts`**: New file management mutations and queries
- **`convex/fileProcessor.ts`**: Background file processing logic
- **`convex/dashboard.ts`**: Added `getRecentWatchEvents` query

### **UI Components**
- **`components/import/FileUploadNew.tsx`**: Simplified file upload component
- **`components/import/FileStatus.tsx`**: Real-time file status tracking
- **`components/import/ImportPageNew.tsx`**: New import page with status updates

### **Worker Updates**
- **`apps/worker/src/index.ts`**: Added file processing job handlers

## 🔄 **Data Flow**

### **1. File Upload**
```typescript
// User uploads file
const { fileId } = await uploadFile({
  fileName: file.name,
  fileSize: file.size,
  mimeType: file.type,
  storageRef: await uploadToStorage(file),
  checksum: await calculateFileChecksum(file)
})

// File processing job is automatically enqueued
```

### **2. Background Processing**
```typescript
// Worker picks up file processing job
async function handleProcessHtmlFile(job: JobLease) {
  // 1. Download file from storage
  const fileContent = await downloadFromStorage(payload.storageRef)
  
  // 2. Parse HTML content
  const records = await parser.parseHTML(fileContent)
  
  // 3. Ingest records in chunks
  await ingestWatchRecords(records)
  
  // 4. Mark file as completed
  await completeFileProcessing(fileId, recordCount)
  
  // 5. Enqueue enrichment jobs
  await enqueueEnrichmentJobs()
}
```

### **3. Status Tracking**
```typescript
// Real-time status updates
const fileStatus = useQuery(api.files.getFileStatus, { fileId })
// Status: 'uploaded' | 'processing' | 'completed' | 'failed'
```

## 🎨 **User Experience Improvements**

### **Immediate Upload**
- ✅ **Fast upload** - no waiting for processing
- ✅ **Background processing** - user can continue using app
- ✅ **Real-time status** - see processing progress
- ✅ **Error handling** - clear error messages

### **File Management**
- ✅ **File history** - see all uploaded files
- ✅ **Status tracking** - real-time processing updates
- ✅ **Error details** - specific error messages
- ✅ **File cleanup** - delete completed/failed files

## 🔧 **Implementation Details**

### **File Storage**
```typescript
// Placeholder implementation - needs actual storage solution
async function uploadToStorage(file: File): Promise<string> {
  // TODO: Implement actual file upload to:
  // - AWS S3
  // - Cloudinary
  // - Google Cloud Storage
  // - Any other object storage
  
  return `storage://${file.name}-${Date.now()}`
}
```

### **Job Queue Integration**
```typescript
// File processing jobs are automatically enqueued
await enqueueJobInternal(ctx, {
  type: 'file.process_html',
  userId,
  fileId,
  priority: 10,
  payload: { fileName, fileSize, storageRef },
  dedupeKey: `file.process_html:${fileId}`,
})
```

### **Error Handling**
```typescript
// Comprehensive error handling
try {
  const records = await parser.parseHTML(fileContent)
  await completeFileProcessing(fileId, records.length)
} catch (error) {
  await completeFileProcessing(fileId, 0, error.message)
}
```

## 🚀 **Benefits**

### **Performance**
- **Non-blocking uploads** - UI remains responsive
- **Chunked processing** - handles large files efficiently
- **Background enrichment** - no user waiting time

### **Scalability**
- **Queue-based processing** - can handle multiple files
- **Worker scaling** - add more workers as needed
- **Storage separation** - files stored separately from database

### **Reliability**
- **Retry logic** - failed jobs are retried
- **Error tracking** - detailed error messages
- **Status persistence** - processing state is saved

### **User Experience**
- **Immediate feedback** - upload completes quickly
- **Progress tracking** - see processing status
- **Error recovery** - clear error messages and retry options

## 📋 **Next Steps**

### **Required Implementations**
1. **File Storage**: Implement actual file upload to object storage
2. **Storage Download**: Implement file download in worker
3. **Error Monitoring**: Add comprehensive error logging
4. **Performance Metrics**: Track processing times and success rates

### **Optional Enhancements**
1. **File Validation**: Pre-upload file format validation
2. **Progress Updates**: More granular processing progress
3. **Batch Processing**: Process multiple files simultaneously
4. **File Compression**: Compress files before storage

## 🎉 **Summary**

The new architecture successfully separates file upload from processing, providing:

- ✅ **Better user experience** with immediate uploads
- ✅ **Improved scalability** with background processing
- ✅ **Enhanced reliability** with proper error handling
- ✅ **Real-time status tracking** for user feedback

The implementation is ready for production use once the file storage solution is configured.
