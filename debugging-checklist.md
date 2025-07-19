# 🔧 Debugging Checklist

## Quick Debugging Workflows

### When Video Processing Fails

**✅ Check These Log Patterns:**

1. **HTML Parsing Issues**
   ```bash
   grep "DOM parsing completed" logs/application-*.log
   # Look for: entriesFound count
   # Expected: > 0 entries found
   ```

2. **Low Extraction Rate**
   ```bash
   grep "extractionSuccessRate" logs/application-*.log
   # Look for: < 70% success rate
   # Action: Check HTML format changes
   ```

3. **API Quota Problems**
   ```bash
   grep "quotaRemaining" logs/application-*.log
   # Look for: quotaRemaining: 0 or low values
   # Action: Check YouTube API key and quota
   ```

4. **Slow Processing**
   ```bash
   grep "🐌 SLOW" logs/application-*.log
   # Look for: Operations > 1000ms
   # Action: Check system resources
   ```

### When API Calls Fail

**✅ Frontend Debugging:**

1. **Check Network Tab**
   - Status codes (400, 401, 403, 500)
   - Response times > 5 seconds
   - CORS errors

2. **Check Browser Console**
   ```javascript
   // Look for structured log entries
   [timestamp] ERROR [correlation-id]: API call failed
   ```

3. **Check Request Correlation**
   ```bash
   # Find correlation ID in browser, then search backend logs
   grep "correlation-id-from-browser" logs/application-*.log
   ```

### When Performance is Slow

**✅ Performance Investigation:**

1. **Find Bottlenecks**
   ```bash
   grep "timerEnd.*totalMs" logs/application-*.log | sort -k5 -nr
   ```

2. **Check Database Operations**
   ```bash
   grep "Database operation" logs/application-*.log
   ```

3. **Monitor API Response Times**
   ```bash
   grep "API call.*duration" logs/application-*.log
   ```

### When Uploads Fail

**✅ Upload Debugging:**

1. **File Size Issues**
   ```bash
   grep "fileSize" logs/application-*.log
   # Check against MAX_FILE_SIZE limit
   ```

2. **Processing Timeout**
   ```bash
   grep "UPLOAD_TIMEOUT" logs/application-*.log
   # Check if processing exceeds timeout
   ```

3. **Memory Issues**
   ```bash
   grep "memory\|heap" logs/application-*.log
   # Look for out-of-memory errors
   ```

### Error Investigation Steps

**✅ When You Find an Error:**

1. **Get the Full Context**
   ```bash
   # Step 1: Find the error
   grep "ERROR" logs/error-*.log | tail -5
   
   # Step 2: Extract correlation ID
   CORRELATION_ID="abc-123-def"
   
   # Step 3: Get full request trace
   grep "$CORRELATION_ID" logs/application-*.log
   ```

2. **Check Related Operations**
   ```bash
   # Check what happened before/after
   grep -B5 -A5 "$CORRELATION_ID" logs/application-*.log
   ```

3. **Look for Patterns**
   ```bash
   # Similar errors in timeframe
   grep "$(date '+%Y-%m-%d')" logs/error-*.log | grep "similar-error-pattern"
   ```

### Common Error Patterns

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `extractionSuccessRate: 0%` | HTML format changed | Update selectors |
| `quotaRemaining: 0` | API quota exhausted | Check API limits |
| `🐌 SLOW: Database Query` | Database performance | Check indexes |
| `CORS error` | Frontend/backend mismatch | Check CORS_ORIGIN |
| `Connection timeout` | Network/server issues | Check server status |

### Quick Commands Reference

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Watch logs in real-time
tail -f logs/application-$(date +%Y-%m-%d).log

# Search for specific user's activity
grep "userId.*12345" logs/application-*.log

# Find all slow operations today
grep "🐌 SLOW.*$(date +%Y-%m-%d)" logs/application-*.log

# Check error rate
grep "ERROR.*$(date +%Y-%m-%d)" logs/error-*.log | wc -l

# Monitor API usage
grep "YouTube API.*quotaUsed" logs/application-*.log | tail -10
```

### Development vs Production

**Development Debugging:**
- Use `LOG_LEVEL=debug`
- Enable all logging features
- Check browser console for frontend issues
- Use `console.log` temporarily (remove before commit)

**Production Debugging:**
- Use `LOG_LEVEL=info` or `LOG_LEVEL=warn`
- Check correlation IDs for request tracing
- Monitor error rates and performance metrics
- Never add `console.log` in production code

---

💡 **Pro Tip**: Always start with the correlation ID when debugging user-reported issues. It's the fastest way to trace the entire request flow.