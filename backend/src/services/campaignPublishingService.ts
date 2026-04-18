import * as fs from 'fs';
import * as path from 'path';
import db from '../config/database';
import { emailService } from './emailService';
import { getMaterialFilePath } from './collateralFileService';
import logger from '../utils/logger';

export class CampaignPublishingService {

  /**
   * Process all channels that are scheduled and due for publishing.
   * Called by cron every minute.
   */
  static async processScheduledChannels(): Promise<void> {
    try {
      // Find channels with status='scheduled' and scheduled_at <= NOW()
      const [channels] = await db.query(`
        SELECT mcc.*, mc.name as campaign_name, mc.description as campaign_description
        FROM marketing_campaign_channels mcc
        JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id
        WHERE mcc.status = 'scheduled' AND mcc.scheduled_at <= NOW()
        LIMIT 10
      `);

      const channelList = channels as any[];
      if (channelList.length === 0) return; // Nothing to publish

      logger.info({ message: `Publishing ${channelList.length} scheduled channel(s)` });

      for (const channel of channelList) {
        try {
          await this.publishChannel(channel);
        } catch (err: any) {
          logger.error({ message: `Failed to publish channel ${channel.id}`, error: err.message, channel: channel.channel });
          // Mark as failed
          await db.query(
            'UPDATE marketing_campaign_channels SET status = ?, updated_at = NOW() WHERE id = ?',
            ['failed', channel.id]
          );
        }
      }
    } catch (err: any) {
      logger.error({ message: 'processScheduledChannels error', error: err.message });
    }
  }

  /**
   * Publish a single channel -- routes to the right platform
   */
  static async publishChannel(channel: any): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    const platform = (channel.channel || '').toLowerCase();

    let result: { success: boolean; externalPostId?: string; error?: string };

    switch (platform) {
      case 'linkedin':
        result = await this.publishToLinkedIn(channel);
        break;
      case 'facebook':
        result = await this.publishToFacebook(channel);
        break;
      case 'twitter':
        result = await this.publishToTwitter(channel);
        break;
      case 'instagram':
        result = await this.publishToInstagram(channel);
        break;
      case 'email':
        result = await this.publishEmail(channel);
        break;
      default:
        result = { success: false, error: `Unsupported platform: ${platform}` };
    }

    if (result.success) {
      // Update channel as published
      await db.query(
        `UPDATE marketing_campaign_channels
         SET status = 'published', published_at = NOW(), external_post_id = ?, updated_at = NOW()
         WHERE id = ?`,
        [result.externalPostId || null, channel.id]
      );

      // Log analytics
      await db.query(
        'INSERT INTO marketing_analytics (campaign_id, channel, metric_type, metric_value) VALUES (?, ?, ?, ?)',
        [channel.campaign_id, platform, 'published', 1]
      );

      logger.info({ message: `Published channel ${channel.id} to ${platform}`, externalPostId: result.externalPostId });
    } else {
      await db.query(
        'UPDATE marketing_campaign_channels SET status = ?, updated_at = NOW() WHERE id = ?',
        ['failed', channel.id]
      );
      logger.error({ message: `Failed to publish channel ${channel.id} to ${platform}`, error: result.error });
    }

    return result;
  }

  /**
   * Get the access token for a platform from social_media_accounts
   */
  private static async getAccountForPlatform(platform: string): Promise<any | null> {
    const [accounts] = await db.query(
      'SELECT * FROM social_media_accounts WHERE platform = ? AND is_active = TRUE ORDER BY updated_at DESC LIMIT 1',
      [platform]
    );
    const list = accounts as any[];
    return list.length > 0 ? list[0] : null;
  }

  // ==================== LINKEDIN ====================
  static async publishToLinkedIn(channel: any): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    try {
      const account = await this.getAccountForPlatform('linkedin');
      if (!account || !account.access_token) {
        return { success: false, error: 'No LinkedIn account connected or access token missing' };
      }

      // Strip HTML for LinkedIn (plain text only)
      const text = (channel.post_content || '').replace(/<[^>]*>/g, '').trim();
      if (!text) return { success: false, error: 'No content to publish' };

      // LinkedIn Share API v2 -- use userinfo to get person URN
      const meResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${account.access_token}` },
      });
      if (!meResponse.ok) {
        const errText = await meResponse.text();
        return { success: false, error: `LinkedIn auth failed: ${errText}` };
      }
      const me = await meResponse.json() as any;
      const personUrn = `urn:li:person:${me.sub}`;

      // Create a share post
      const postBody = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });

      if (!postResponse.ok) {
        const errData = await postResponse.text();
        return { success: false, error: `LinkedIn post failed: ${errData}` };
      }

      const postResult = await postResponse.json() as any;
      return { success: true, externalPostId: postResult.id || '' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==================== FACEBOOK ====================
  static async publishToFacebook(channel: any): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    try {
      const account = await this.getAccountForPlatform('facebook');
      if (!account || !account.access_token) {
        return { success: false, error: 'No Facebook page connected or access token missing' };
      }

      const text = (channel.post_content || '').replace(/<[^>]*>/g, '').trim();
      if (!text) return { success: false, error: 'No content to publish' };

      const pageId = account.page_id || account.account_id;
      if (!pageId) return { success: false, error: 'No Facebook page ID found' };

      const postResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          access_token: account.access_token,
        }),
      });

      if (!postResponse.ok) {
        const errData = await postResponse.text();
        return { success: false, error: `Facebook post failed: ${errData}` };
      }

      const postResult = await postResponse.json() as any;
      return { success: true, externalPostId: postResult.id || '' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==================== TWITTER ====================
  static async publishToTwitter(channel: any): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    try {
      const account = await this.getAccountForPlatform('twitter');
      if (!account || !account.access_token) {
        return { success: false, error: 'No Twitter/X account connected or access token missing' };
      }

      const text = (channel.post_content || '').replace(/<[^>]*>/g, '').trim();
      if (!text) return { success: false, error: 'No content to publish' };

      // Twitter v2 API -- Create Tweet
      const postResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!postResponse.ok) {
        const errData = await postResponse.text();
        return { success: false, error: `Twitter post failed: ${errData}` };
      }

      const postResult = await postResponse.json() as any;
      return { success: true, externalPostId: postResult.data?.id || '' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==================== INSTAGRAM ====================
  static async publishToInstagram(_channel: any): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    // Instagram requires an image or video -- text-only posts aren't supported.
    // For now, return a message suggesting the user publish manually.
    return {
      success: false,
      error: 'Instagram requires image/video content. Text-only publishing is not supported via API. Please publish manually.'
    };
  }

  // ==================== EMAIL ====================
  static async publishEmail(channel: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the email marketing campaign linked to this channel's campaign
      const [emailCampaigns] = await db.query(
        `SELECT emc.*, eml.id as list_id
         FROM email_marketing_campaigns emc
         JOIN email_marketing_lists eml ON eml.id = emc.list_id
         WHERE emc.campaign_id = ? AND emc.status != 'sent'
         LIMIT 1`,
        [channel.campaign_id]
      );

      const emailCampaignList = emailCampaigns as any[];

      // If there's a linked email campaign, send via that
      if (emailCampaignList.length > 0) {
        const emailCampaign = emailCampaignList[0];
        const subject = emailCampaign.subject || channel.campaign_name || 'Campaign Update';
        const body = emailCampaign.body || channel.post_content || '';

        // Get list members
        const [members] = await db.query(
          "SELECT email, name FROM email_marketing_list_members WHERE list_id = ? AND status = 'active'",
          [emailCampaign.list_id]
        );
        const memberList = members as any[];

        if (memberList.length === 0) {
          return { success: false, error: 'No active members in the email list' };
        }

        // Get media attachments for the channel
        const mediaAttachments = await this.getChannelMediaAttachments(channel);

        let sentCount = 0;
        let failCount = 0;

        for (const member of memberList) {
          try {
            if (mediaAttachments.length > 0) {
              // Use sendProposalEmail which supports attachments
              await emailService.sendProposalEmail({
                to: member.email,
                subject,
                htmlBody: body,
                textBody: body.replace(/<[^>]*>/g, ''),
                attachments: mediaAttachments,
              });
            } else {
              await emailService.sendNotification(
                member.email,
                subject,
                body
              );
            }
            sentCount++;
          } catch (err: any) {
            failCount++;
            logger.warn({ message: `Email send failed for ${member.email}`, error: err.message });
          }
        }

        // Update email campaign stats
        await db.query(
          `UPDATE email_marketing_campaigns SET status = 'sent', sent_at = NOW(), total_sent = ? WHERE id = ?`,
          [sentCount, emailCampaign.id]
        );

        logger.info({ message: `Email campaign sent: ${sentCount} success, ${failCount} failed, attachments: ${mediaAttachments.length}` });
        return { success: true };
      }

      // Fallback: If no linked email campaign, check if channel has target_list_id
      if (channel.target_list_id) {
        const subject = channel.campaign_name || 'Campaign Update';
        const body = channel.post_content || '';

        const [members] = await db.query(
          "SELECT email, name FROM email_marketing_list_members WHERE list_id = ? AND status = 'active'",
          [channel.target_list_id]
        );
        const memberList = members as any[];

        if (memberList.length === 0) {
          return { success: false, error: 'No active members in the target email list' };
        }

        // Get media attachments for the channel
        const mediaAttachments = await this.getChannelMediaAttachments(channel);

        let sentCount = 0;
        let failCount = 0;
        const BATCH_SIZE = 10;
        const BATCH_DELAY_MS = 3000;

        for (let i = 0; i < memberList.length; i += BATCH_SIZE) {
          const batch = memberList.slice(i, i + BATCH_SIZE);

          for (const member of batch) {
            try {
              if (mediaAttachments.length > 0) {
                await emailService.sendProposalEmail({
                  to: member.email,
                  subject,
                  htmlBody: body,
                  textBody: body.replace(/<[^>]*>/g, ''),
                  attachments: mediaAttachments,
                });
              } else {
                await emailService.sendNotification(member.email, subject, body);
              }
              sentCount++;
            } catch (err: any) {
              failCount++;
              logger.warn({ message: `Email send failed for ${member.email}`, error: err.message });
            }
          }

          // Throttle: wait between batches (skip delay after last batch)
          if (i + BATCH_SIZE < memberList.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        logger.info({ message: `Direct email send via target_list: ${sentCount} success, ${failCount} failed` });
        return { success: true };
      }

      // No linked email campaign and no target list
      return { success: false, error: 'No email campaign linked to this channel. Create an email campaign or set a target list.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==================== HELPERS ====================

  /**
   * Get media attachments from a channel's media_urls for email sending
   */
  private static async getChannelMediaAttachments(channel: any): Promise<Array<{filename: string; path: string; contentType: string}>> {
    const attachments: Array<{filename: string; path: string; contentType: string}> = [];
    try {
      let mediaUrls = channel.media_urls;
      if (typeof mediaUrls === 'string') mediaUrls = JSON.parse(mediaUrls);
      if (!Array.isArray(mediaUrls)) return attachments;

      for (const media of mediaUrls) {
        if (media.collateralId) {
          const [items] = await db.query('SELECT file_name, original_name, file_type FROM collateral_items WHERE id = ?', [media.collateralId]);
          if ((items as any[]).length > 0) {
            const item = (items as any[])[0];
            const filePath = getMaterialFilePath(item.file_name);
            if (fs.existsSync(filePath)) {
              attachments.push({ filename: item.original_name, path: path.resolve(filePath), contentType: item.file_type });
            }
          }
        }
      }
    } catch { /* non-critical */ }
    return attachments;
  }
}
