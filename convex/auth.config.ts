// Clerk app ID extracted from publishable key: pk_test_aGVscGluZy1zd2FuLTUzLmNsZXJrLmFjY291bnRzLmRldiQ
const clerkAppId = "aGVscGluZy1zd2FuLTUz";

const authConfig = {
  providers: [
    {
      // Primary: for Clerk JWT tokens with convex template
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
    {
      // Fallback: for default Clerk JWT tokens
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: clerkAppId,
    },
  ],
};

export default authConfig;

