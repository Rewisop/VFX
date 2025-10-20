const rawPatterns = process.env.NEXT_IMAGE_REMOTE_PATTERNS?.split(",") ?? [];

function normalizeNanoBananaUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "api.nanobanana.dev") {
      parsed.hostname = "api.nanobanana.com";
      return parsed.toString();
    }
  } catch (error) {
    return url;
  }

  return url;
}

const baseFromEnv = process.env.NANO_BANANA_BASE_URL;

const remotePatterns = rawPatterns
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const normalized = entry.includes("://") ? entry : `https://${entry}`;
    const sanitized = normalizeNanoBananaUrl(normalized);
    try {
      const parsed = new URL(sanitized);
      return {
        protocol: parsed.protocol.replace(":", ""),
        hostname: parsed.hostname,
        pathname: parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/**",
      };
    } catch (error) {
      console.warn(`Invalid NEXT_IMAGE_REMOTE_PATTERNS entry: ${entry}`);
      return null;
    }
  })
  .filter(Boolean);

if (!remotePatterns.length && baseFromEnv) {
  try {
    const sanitized = normalizeNanoBananaUrl(baseFromEnv);
    const parsed = new URL(sanitized);
    remotePatterns.push({
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      pathname: "/**",
    });
  } catch (error) {
    console.warn("Invalid NANO_BANANA_BASE_URL for image configuration");
  }
}

const nextConfig = {
  images: {
    remotePatterns,
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
