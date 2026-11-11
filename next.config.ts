import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the committed curated-copy files into the /api/gazette function so it
  // can read them off disk at runtime. A same-origin HTTP fetch of a public
  // asset is unreliable under deployment protection / internal routing, so the
  // route reads these from the filesystem instead.
  outputFileTracingIncludes: {
    "/api/gazette": ["./public/league-copy/**"],
  },
};

export default nextConfig;
