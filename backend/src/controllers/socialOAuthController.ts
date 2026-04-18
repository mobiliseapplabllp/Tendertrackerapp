import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { socialOAuthConfig, isPlatformConfigured, getConfiguredPlatforms } from '../config/socialOAuth';
import logger from '../utils/logger';

// ==================== Helpers ====================

const VALID_PLATFORMS = ['linkedin', 'facebook', 'twitter', 'instagram', 'youtube'];
const FRONTEND_BASE = process.env.APP_URL || process.env.CORS_ORIGIN || 'https://tendertracker.mobilisepro.com';
const STATE_TOKEN_EXPIRY_MINUTES = 10;

/**
 * Generate a URL-safe random string for OAuth state parameter.
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate PKCE code_verifier and code_challenge (S256) for Twitter OAuth 2.0.
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = hash.toString('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Store an OAuth state token in the database with an expiry time.
 */
async function storeStateToken(
  stateToken: string,
  userId: number,
  platform: string,
  codeVerifier: string | null = null
): Promise<void> {
  const expiresAt = new Date(Date.now() + STATE_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  await db.query(
    `INSERT INTO oauth_state_tokens (state_token, user_id, platform, code_verifier, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [stateToken, userId, platform, codeVerifier, expiresAt]
  );
}

/**
 * Validate and consume an OAuth state token. Returns the stored row or throws.
 */
async function validateAndConsumeState(
  stateToken: string,
  platform: string
): Promise<{ user_id: number; code_verifier: string | null }> {
  const [rows] = await db.query(
    `SELECT user_id, platform, code_verifier, expires_at
     FROM oauth_state_tokens
     WHERE state_token = ? AND platform = ?`,
    [stateToken, platform]
  );
  const results = rows as any[];

  if (results.length === 0) {
    throw new CustomError('Invalid or expired OAuth state token', 400);
  }

  const row = results[0];

  if (new Date(row.expires_at) < new Date()) {
    // Clean up the expired token
    await db.query('DELETE FROM oauth_state_tokens WHERE state_token = ?', [stateToken]);
    throw new CustomError('OAuth state token has expired. Please try connecting again.', 400);
  }

  // Consume (delete) the token so it cannot be reused
  await db.query('DELETE FROM oauth_state_tokens WHERE state_token = ?', [stateToken]);

  return { user_id: row.user_id, code_verifier: row.code_verifier };
}

/**
 * Clean up expired state tokens (called opportunistically).
 */
async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db.query('DELETE FROM oauth_state_tokens WHERE expires_at < NOW()');
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Make an HTTP request using Node 18+ built-in fetch.
 * Returns parsed JSON or throws on non-2xx responses.
 */
async function httpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<any> {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
    // Try to parse as JSON anyway (some APIs return JSON without the header)
    try { data = JSON.parse(data); } catch { /* keep as string */ }
  }

  if (!response.ok) {
    const errMsg = typeof data === 'object'
      ? (data.error_description || data.error || data.message || JSON.stringify(data))
      : data;
    throw new Error(`HTTP ${response.status}: ${errMsg}`);
  }

  return data;
}

// ==================== Controller ====================

export class SocialOAuthController {

  /**
   * GET /marketing/social/oauth/:platform/initiate
   *
   * Builds the OAuth authorization URL and redirects the user's browser.
   * Accepts auth token as ?token= query param (since browser redirect can't send headers).
   */
  static async initiateOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform } = req.params;

      if (!VALID_PLATFORMS.includes(platform)) {
        throw new CustomError(`Unsupported platform: ${platform}`, 400);
      }

      if (!isPlatformConfigured(platform)) {
        throw new CustomError(`OAuth is not configured for ${platform}. Set environment variables.`, 400);
      }

      // Manually extract user from JWT (no auth middleware on this route — browser redirect can't send headers)
      const token = (req.query.token as string) || req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new CustomError('Authentication required. Please log in and try again.', 401);
      }
      let userId: number;
      try {
        const secret = process.env.JWT_SECRET || 'your-default-secret-change-this';
        const decoded = jwt.verify(token, secret) as any;
        userId = decoded.userId || decoded.id;
        if (!userId) throw new Error('Invalid token payload');
      } catch (jwtErr) {
        throw new CustomError('Session expired. Please log in again.', 401);
      }
      const config = socialOAuthConfig[platform];
      const state = generateState();

      // Opportunistically clean up expired tokens
      cleanupExpiredTokens();

      let authorizationUrl: string;

      switch (platform) {
        case 'linkedin': {
          await storeStateToken(state, userId, platform);
          const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            state,
            scope: 'openid profile email w_member_social',
          });
          authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
          break;
        }

        case 'facebook': {
          await storeStateToken(state, userId, platform);
          const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            state,
            scope: 'public_profile,pages_show_list,pages_read_engagement',
          });
          authorizationUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
          break;
        }

        case 'twitter': {
          // Twitter uses OAuth 2.0 with PKCE
          const { codeVerifier, codeChallenge } = generatePKCE();
          await storeStateToken(state, userId, platform, codeVerifier);
          const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            state,
            scope: 'tweet.read tweet.write users.read offline.access',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
          });
          authorizationUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
          break;
        }

        case 'instagram': {
          // Instagram uses Facebook/Meta OAuth (same FB app)
          await storeStateToken(state, userId, platform);
          const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            state,
            scope: 'public_profile,pages_show_list,pages_read_engagement',
          });
          authorizationUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
          break;
        }

        case 'youtube': {
          await storeStateToken(state, userId, platform);
          const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            state,
            scope: 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload',
            access_type: 'offline',
            prompt: 'consent',
          });
          authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
          break;
        }

        default:
          throw new CustomError(`Unsupported platform: ${platform}`, 400);
      }

      logger.info({ message: 'OAuth initiated', platform, userId });
      res.redirect(authorizationUrl);
    } catch (error: any) {
      // If this is a redirect-based flow, send the user back with an error
      if (error instanceof CustomError) {
        return res.redirect(
          `${FRONTEND_BASE}/#social-connected?platform=${req.params.platform}&success=false&error=${encodeURIComponent(error.message)}`
        );
      }
      next(error);
    }
  }

  /**
   * GET /marketing/social/oauth/:platform/callback
   *
   * Handles the OAuth callback from the platform.
   * This route is public (no auth middleware) — user identity comes from the state token.
   */
  static async handleCallback(req: Request, res: Response, _next: NextFunction) {
    const { platform } = req.params;
    const { code, state, error: oauthError, error_description } = req.query as Record<string, string>;

    try {
      // Handle OAuth denial
      if (oauthError) {
        logger.warn({ message: 'OAuth denied by user', platform, error: oauthError, error_description });
        return res.redirect(
          `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=false&error=${encodeURIComponent(error_description || oauthError)}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=false&error=${encodeURIComponent('Missing code or state parameter')}`
        );
      }

      if (!VALID_PLATFORMS.includes(platform)) {
        return res.redirect(
          `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=false&error=${encodeURIComponent('Unsupported platform')}`
        );
      }

      // Validate state token and get user ID
      const { user_id: userId, code_verifier } = await validateAndConsumeState(state, platform);
      const config = socialOAuthConfig[platform];

      // Exchange code for tokens
      let accessToken: string;
      let refreshToken: string | null = null;
      let tokenExpiresAt: Date | null = null;

      // Profile data
      let accountName = '';
      let accountId = '';
      let profileUrl = '';

      switch (platform) {
        case 'linkedin': {
          // Exchange code for token
          const tokenData = await httpRequest('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: config.redirectUri,
              client_id: config.clientId,
              client_secret: config.clientSecret,
            }).toString(),
          });

          accessToken = tokenData.access_token;
          if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }
          if (tokenData.refresh_token) {
            refreshToken = tokenData.refresh_token;
          }

          // Fetch profile
          const profile = await httpRequest('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          accountName = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || 'LinkedIn User';
          accountId = profile.sub || '';
          profileUrl = `https://www.linkedin.com/in/${profile.sub || ''}`;
          break;
        }

        case 'facebook': {
          // Exchange code for token
          const tokenParams = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            client_secret: config.clientSecret,
            code,
          });
          const tokenData = await httpRequest(
            `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`
          );

          accessToken = tokenData.access_token;
          if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }

          // Fetch profile
          const profile = await httpRequest(
            `https://graph.facebook.com/v18.0/me?fields=id,name,link&access_token=${accessToken}`
          );
          accountName = profile.name || 'Facebook User';
          accountId = profile.id || '';
          profileUrl = profile.link || `https://facebook.com/${profile.id}`;

          // Try to get managed pages — connect ALL pages as separate accounts
          try {
            const pages = await httpRequest(
              `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
            );
            if (pages.data && pages.data.length > 0) {
              // Save each page as a separate account so user can pick
              for (const page of pages.data) {
                const pageName = page.name || 'Facebook Page';
                const pageId = page.id || '';
                const pageToken = page.access_token || accessToken;
                const pageUrl = `https://facebook.com/${pageId}`;

                await db.query(
                  `INSERT INTO social_media_accounts
                     (platform, account_name, account_id, page_id, access_token, refresh_token, token_expires_at, profile_url, is_active, connected_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
                   ON DUPLICATE KEY UPDATE
                     account_name = VALUES(account_name), access_token = VALUES(access_token),
                     refresh_token = VALUES(refresh_token), token_expires_at = VALUES(token_expires_at),
                     profile_url = VALUES(profile_url), is_active = TRUE, updated_at = NOW()`,
                  [platform, pageName, pageId, pageId, pageToken, refreshToken, tokenExpiresAt, pageUrl, userId]
                );
              }
              // Skip the default upsert below — we already saved pages
              res.redirect(`${FRONTEND_BASE}/#social-connected?platform=${platform}&success=true`);
              return;
            }
          } catch {
            // No pages or permissions — continue with user profile token
          }
          break;
        }

        case 'twitter': {
          // Twitter uses PKCE — include code_verifier
          const tokenData = await httpRequest('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: config.redirectUri,
              client_id: config.clientId,
              code_verifier: code_verifier || '',
            }).toString(),
          });

          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || null;
          if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }

          // Fetch profile
          const profile = await httpRequest(
            'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url',
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const userData = profile.data || profile;
          accountName = userData.name || userData.username || 'Twitter User';
          accountId = userData.id || '';
          profileUrl = `https://twitter.com/${userData.username || ''}`;
          break;
        }

        case 'instagram': {
          // Instagram uses Facebook/Meta OAuth — same token exchange
          const tokenParams = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            client_secret: config.clientSecret,
            code,
          });
          const tokenData = await httpRequest(
            `https://graph.facebook.com/v18.0/oauth/access_token?${tokenParams.toString()}`
          );

          accessToken = tokenData.access_token;
          if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }

          // Fetch ALL Facebook pages, find Instagram business accounts linked to each
          try {
            const pages = await httpRequest(
              `https://graph.facebook.com/v18.0/me/accounts?limit=100&access_token=${accessToken}`
            );
            if (pages.data && pages.data.length > 0) {
              logger.info({ message: 'Instagram OAuth: Found pages', pageCount: pages.data.length, pageNames: pages.data.map((p: any) => p.name) });
              let foundAny = false;
              for (const page of pages.data) {
                try {
                  const igAccount = await httpRequest(
                    `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || accessToken}`
                  );
                  logger.info({ message: 'Instagram OAuth: Page IG check', pageName: page.name, pageId: page.id, hasIG: !!igAccount.instagram_business_account });
                  if (igAccount.instagram_business_account) {
                    const igProfile = await httpRequest(
                      `https://graph.facebook.com/v18.0/${igAccount.instagram_business_account.id}?fields=name,username,profile_picture_url,followers_count&access_token=${page.access_token || accessToken}`
                    );
                    const igName = igProfile.name || igProfile.username || page.name || 'Instagram Account';
                    const igId = igAccount.instagram_business_account.id;
                    const igUrl = igProfile.username ? `https://instagram.com/${igProfile.username}` : '';
                    const igFollowers = igProfile.followers_count || 0;
                    const pageToken = page.access_token || accessToken;
                    logger.info({ message: 'Instagram OAuth: Saving IG account', igName, igId, igUrl, igFollowers, forPage: page.name });

                    await db.query(
                      `INSERT INTO social_media_accounts
                         (platform, account_name, account_id, page_id, access_token, refresh_token, token_expires_at, profile_url, followers_count, is_active, connected_by)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
                       ON DUPLICATE KEY UPDATE
                         account_name = VALUES(account_name), access_token = VALUES(access_token),
                         profile_url = VALUES(profile_url), followers_count = VALUES(followers_count),
                         is_active = TRUE, updated_at = NOW()`,
                      ['instagram', igName, igId, page.id, pageToken, refreshToken, tokenExpiresAt, igUrl, igFollowers, userId]
                    );
                    foundAny = true;
                  }
                } catch (igErr: any) {
                  logger.warn({ message: 'Instagram OAuth: IG check failed for page', pageName: page.name, error: igErr.message });
                }
              }
              if (foundAny) {
                res.redirect(`${FRONTEND_BASE}/#social-connected?platform=${platform}&success=true`);
                return;
              }
            }
          } catch {
            // Fallback — store user-level info
          }
          // No IG business accounts found on any page
          const fbProfile = await httpRequest(
            `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
          );
          accountName = fbProfile.name || 'Instagram User';
          accountId = fbProfile.id || '';
          profileUrl = '';
          break;
        }

        case 'youtube': {
          // Exchange code for token
          const tokenData = await httpRequest('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: config.redirectUri,
              client_id: config.clientId,
              client_secret: config.clientSecret,
            }).toString(),
          });

          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token || null;
          if (tokenData.expires_in) {
            tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          }

          // Fetch channel info
          const channelData = await httpRequest(
            `https://www.googleapis.com/youtube/v3/channels?mine=true&part=snippet,statistics`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (channelData.items && channelData.items.length > 0) {
            const channel = channelData.items[0];
            accountName = channel.snippet?.title || 'YouTube Channel';
            accountId = channel.id || '';
            profileUrl = `https://www.youtube.com/channel/${channel.id || ''}`;
          } else {
            accountName = 'YouTube User';
          }
          break;
        }

        default:
          return res.redirect(
            `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=false&error=Unsupported+platform`
          );
      }

      // Upsert into social_media_accounts
      // Check if an account for this platform + user already exists
      const [existing] = await db.query(
        'SELECT id FROM social_media_accounts WHERE platform = ? AND connected_by = ?',
        [platform, userId]
      );

      if ((existing as any[]).length > 0) {
        // Update existing record
        await db.query(
          `UPDATE social_media_accounts
           SET account_name = ?, account_id = ?, profile_url = ?,
               access_token = ?, refresh_token = ?, token_expires_at = ?,
               is_active = TRUE, updated_at = NOW()
           WHERE platform = ? AND connected_by = ?`,
          [accountName, accountId, profileUrl, accessToken, refreshToken, tokenExpiresAt, platform, userId]
        );
      } else {
        // Insert new record
        await db.query(
          `INSERT INTO social_media_accounts
           (platform, account_name, account_id, profile_url, access_token, refresh_token, token_expires_at, is_active, connected_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
          [platform, accountName, accountId, profileUrl, accessToken, refreshToken, tokenExpiresAt, userId]
        );
      }

      logger.info({ message: 'OAuth connection successful', platform, userId, accountName });

      // Redirect back to the frontend
      res.redirect(
        `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=true`
      );
    } catch (error: any) {
      logger.error({
        message: 'OAuth callback error',
        platform,
        error: error.message,
        stack: error.stack,
      });

      const errorMessage = error instanceof CustomError
        ? error.message
        : 'Failed to complete OAuth connection. Please try again.';

      res.redirect(
        `${FRONTEND_BASE}/#social-connected?platform=${platform}&success=false&error=${encodeURIComponent(errorMessage)}`
      );
    }
  }

  /**
   * GET /marketing/social/oauth/config
   *
   * Returns which platforms have OAuth credentials configured,
   * so the frontend can decide whether to show "Connect via OAuth" or manual entry.
   */
  static async getOAuthConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const configuredPlatforms = getConfiguredPlatforms();

      const platformConfig: Record<string, boolean> = {};
      for (const p of VALID_PLATFORMS) {
        platformConfig[p] = configuredPlatforms.includes(p);
      }

      res.json({
        success: true,
        data: {
          platforms: platformConfig,
          configuredPlatforms,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}
