import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Permissions-Policy",
            value: [
              "geolocation=()",
              "microphone=()",
              "camera=()",
              "autoplay=()",
              "payment=()",
              "publickey-credentials-get=()",
              "screen-wake-lock=()",
              "usb=()",
              "web-share=()",
              "fullscreen=(self)",
              "picture-in-picture=(self)",
              "display-capture=()",
              "encrypted-media=()",
              "gyroscope=()",
              "magnetometer=()",
              "midi=()",
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
