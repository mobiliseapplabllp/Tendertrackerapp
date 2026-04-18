/**
 * Social Media OAuth Configuration
 *
 * Reads OAuth credentials from environment variables for each supported platform.
 * LinkedIn, Facebook/Instagram (Meta), Twitter/X, and YouTube (Google).
 */

export interface PlatformOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const APP_BASE = process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com';

export const socialOAuthConfig: Record<string, PlatformOAuthConfig> = {
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: `${APP_BASE}/api/v1/marketing/social/oauth/linkedin/callback`,
  },
  facebook: {
    clientId: process.env.FACEBOOK_APP_ID || '',
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    redirectUri: `${APP_BASE}/api/v1/marketing/social/oauth/facebook/callback`,
  },
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: `${APP_BASE}/api/v1/marketing/social/oauth/twitter/callback`,
  },
  instagram: {
    clientId: process.env.FACEBOOK_APP_ID || '',     // Same as Facebook (Meta Business Suite)
    clientSecret: process.env.FACEBOOK_APP_SECRET || '',
    redirectUri: `${APP_BASE}/api/v1/marketing/social/oauth/instagram/callback`,
  },
  youtube: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${APP_BASE}/api/v1/marketing/social/oauth/youtube/callback`,
  },
};

/**
 * Check whether a given platform has both clientId and clientSecret configured.
 */
export function isPlatformConfigured(platform: string): boolean {
  const config = socialOAuthConfig[platform];
  return !!(config?.clientId && config?.clientSecret);
}

/**
 * Return a list of platform keys that have valid OAuth credentials.
 */
export function getConfiguredPlatforms(): string[] {
  return Object.keys(socialOAuthConfig).filter(p => isPlatformConfigured(p));
}
