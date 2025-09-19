# Convex Backend Directory

## Purpose
Convex schema, queries, and mutations for server-side data operations. Handles authentication, data storage, and API endpoints.

## Quick Commands
- `npx convex dev` - Start Convex development server
- `npx convex deploy` - Deploy to production
- `npm run dev` - Start Next.js with Convex integration

## Conventions

### Schema Design
- Keep schema in `schema.ts` authoritative
- Update types and clients when schema changes
- Use descriptive field names
- Add indexes for query performance

### Query/Mutation Separation
- Separate read (queries) from write (mutations)
- Keep functions small and focused
- Use proper TypeScript typing
- Handle errors gracefully

### Authentication
- Enforce auth via Clerk where appropriate
- Validate inputs server-side
- Use proper user context
- Never expose sensitive data

## Dependencies
- Clerk for authentication
- Convex client for data operations
- Zod for input validation
- Never import from client-only code

## Testing
- Test queries with mock data
- Test mutations with proper auth context
- Validate error handling
- Test with different user permissions

## File Organization
- `schema.ts` - Database schema definition
- `dashboard.ts` - Dashboard-related queries
- `ingest.ts` - Data ingestion mutations
- `auth.config.ts` - Authentication configuration

## Common Patterns

### Query Functions
```typescript
export const getDashboardData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    
    // Query data
    return await ctx.db
      .query("watchRecords")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect()
  }
})
```

### Mutation Functions
```typescript
export const ingestWatchData = mutation({
  args: { 
    records: v.array(v.object({
      // Record schema
    }))
  },
  handler: async (ctx, args) => {
    // Validate input
    // Process records
    // Store in database
  }
})
```

## Security Guidelines
- Always validate user authentication
- Sanitize all inputs
- Use proper error messages
- Never expose internal errors
- Rate limit mutations

## Performance
- Use proper indexes
- Limit query results
- Cache frequently accessed data
- Optimize for common query patterns

## Pitfalls
1. **Don't trust client data** - Always validate server-side
2. **Don't expose sensitive fields** - Use proper field selection
3. **Don't forget error handling** - Handle all failure cases
4. **Don't skip authentication** - Verify user identity
5. **Don't ignore performance** - Use indexes and limits

## Links
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Integration](./auth.config.ts)
- [Schema Definition](./schema.ts)
- [API Reference](../docs/api/)