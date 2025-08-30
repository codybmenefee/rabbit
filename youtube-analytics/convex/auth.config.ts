const authConfig = {
  providers: [
    {
      // Replace with your Clerk Issuer URL from the "convex" JWT template
      // or configure via env var and Convex dashboard
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;

