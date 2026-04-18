import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
  ArrowLeft, Mail, Copy, Check, ExternalLink, Send, Paperclip, Clock, Sparkles, Plus, FileText, Share2
} from 'lucide-react';
import { collateralApi } from '../lib/api';

interface ShareCollateralPageProps {
  item: {
    id: number;
    title: string;
    description: string;
    original_name: string;
    file_type: string;
    file_size: number;
    file_extension?: string;
    category_name?: string;
    product_line_id?: number | null;
    product_line_name?: string | null;
    product_name?: string | null;
  };
  onBack: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function ShareCollateralPage({ item, onBack }: ShareCollateralPageProps) {
  const [activeTab, setActiveTab] = useState<string>('link');
  const [shareLink, setShareLink] = useState('');
  const [linkExpiry, setLinkExpiry] = useState<string>('none');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Email
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [attachFile, setAttachFile] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Additional attachments
  const [sameProductLineItems, setSameProductLineItems] = useState<any[]>([]);
  const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<number[]>([]);
  const [showAttachMore, setShowAttachMore] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // WhatsApp/SMS (separate messages — WhatsApp has no link, SMS has link)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [sharingWa, setSharingWa] = useState(false);

  // History
  const [shareHistory, setShareHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    generateShareLink();
    prepareDefaults();
  }, [item.id]);

  // Auto-update SMS message when share link is ready
  useEffect(() => {
    if (shareLink && smsMessage.includes('{link}')) {
      setSmsMessage(prev => prev.replace('{link}', shareLink));
    }
  }, [shareLink]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const expiresInDays = linkExpiry === 'none' ? null : parseInt(linkExpiry);
      const res = await collateralApi.createPublicLink({ collateralId: item.id, expiresInDays });
      if (res.success) setShareLink(res.data.shareUrl);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const prepareDefaults = () => {
    setEmailSubject(`Sharing: ${item.title}`);
    setEmailBody(`<p>Hi,</p><p>Please find the shared document: <strong>${item.title}</strong></p><p>${item.description || ''}</p><p>Best regards</p>`);
    setAttachFile(true); // Default: attach file in email
    // WhatsApp: no link (file will be shared as attachment)
    setWaMessage(`Hi! I'm sharing *${item.title}* with you.\n\n${item.description || ''}\n\nPlease find the document attached.`);
    // SMS: include link (can't attach files)
    setSmsMessage(`Hi! I'm sharing "${item.title}" with you.\n\nDownload: {link}`);
  };

  const handleAiDraft = async () => {
    setGeneratingDraft(true);
    try {
      const res = await collateralApi.aiShareEmailDraft(item.id);
      if (res.success && res.data) {
        setEmailSubject(res.data.subject);
        setEmailBody(res.data.body);
      }
    } catch (err) { console.error(err); }
    finally { setGeneratingDraft(false); }
  };

  const loadRelatedCollateral = async () => {
    setLoadingRelated(true);
    try {
      const res = await collateralApi.getSameProductLineItems(item.id);
      if (res.success) setSameProductLineItems(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingRelated(false); }
    setShowAttachMore(true);
  };

  const toggleAdditional = (id: number) => {
    setSelectedAdditionalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await collateralApi.logShare({ collateralId: item.id, channel: 'copy_link', shareToken: shareLink });
  };

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setSendingEmail(true);
    try {
      const bodyWithLink = emailBody + (shareLink ? `<p><a href="${shareLink}">View/Download Document</a></p>` : '');
      const res = await collateralApi.sendShareEmail({
        collateralId: item.id, to: emailTo, cc: emailCc || undefined,
        subject: emailSubject, body: bodyWithLink, attachFile,
        additionalCollateralIds: selectedAdditionalIds.length > 0 ? selectedAdditionalIds : undefined,
      });
      if (res.success) { alert('Email sent successfully!'); setEmailTo(''); setEmailCc(''); }
    } catch (err: any) { alert('Failed: ' + (err.message || 'Error')); }
    finally { setSendingEmail(false); }
  };

  const handleWhatsApp = async () => {
    if (!phoneNumber) return;
    let phone = phoneNumber.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    setSharingWa(true);
    try {
      // Step 1: Download the file to user's device
      await collateralApi.download(item.id, item.original_name);

      // Step 2: Open WhatsApp with the message (user attaches the downloaded file)
      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`, '_blank');
      }, 500);

      collateralApi.logShare({ collateralId: item.id, channel: 'whatsapp', recipientInfo: phone, sentAsAttachment: true });
    } catch (err: any) {
      console.error('WhatsApp share failed', err);
    } finally {
      setSharingWa(false);
    }
  };

  const handleSMS = () => {
    if (!phoneNumber) return;
    let msg = smsMessage;
    if (msg.includes('{link}')) msg = msg.replace('{link}', shareLink);
    else if (shareLink && !msg.includes(shareLink)) msg += '\n\n' + shareLink;
    window.open(`sms:${phoneNumber}?body=${encodeURIComponent(msg)}`, '_blank');
    collateralApi.logShare({ collateralId: item.id, channel: 'sms', recipientInfo: phoneNumber });
  };

  const handleSocial = (platform: string) => {
    if (!shareLink) return;
    const text = `Check out: ${item.title}`;
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
    collateralApi.logShare({ collateralId: item.id, channel: platform as any });
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await collateralApi.getShareHistory(item.id);
      if (res.success) setShareHistory(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const totalAttachments = (attachFile ? 1 : 0) + selectedAdditionalIds.length;

  const tabs = [
    { id: 'link', label: 'Copy Link', icon: Copy },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: Send },
    { id: 'sms', label: 'SMS', icon: Send },
    { id: 'social', label: 'Social Media', icon: ExternalLink },
    { id: 'history', label: 'Share History', icon: Clock },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Collateral
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="h-6 w-6 text-indigo-600" />
            Share Collateral
          </h1>
        </div>
      </div>

      {/* Item Info Card */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{item.title}</h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
              <span>{item.file_extension?.toUpperCase()} · {formatFileSize(item.file_size)}</span>
              {item.category_name && <Badge variant="outline" className="text-xs">{item.category_name}</Badge>}
              {item.product_line_name && <Badge className="text-xs bg-indigo-100 text-indigo-700">{item.product_line_name}</Badge>}
              {item.product_name && <Badge variant="outline" className="text-xs">{item.product_name}</Badge>}
            </div>
            {item.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>}
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>{item.original_name}</p>
          </div>
        </div>
      </Card>

      {/* Tabs + Content in 2-column layout */}
      <div className="flex gap-6">
        {/* Left sidebar tabs */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content area */}
        <Card className="flex-1 p-6">
          {/* ========= Copy Link ========= */}
          {activeTab === 'link' && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-lg font-semibold">Generate Shareable Link</h3>
              <p className="text-sm text-gray-500">Create a public link that anyone can use to view and download this document without logging in.</p>
              <div>
                <Label className="mb-2 block">Link Expiry</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'none', label: 'Never expires' },
                    { value: '7', label: '7 days' },
                    { value: '30', label: '30 days' },
                    { value: '90', label: '90 days' },
                  ].map(opt => (
                    <Button key={opt.value} variant={linkExpiry === opt.value ? 'default' : 'outline'} size="sm" onClick={() => setLinkExpiry(opt.value)}>
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button variant="outline" onClick={generateShareLink} disabled={loading}>
                {loading ? 'Generating...' : 'Generate New Link'}
              </Button>
              {shareLink && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                  <Input value={shareLink} readOnly className="flex-1 bg-white text-sm" />
                  <Button onClick={handleCopyLink}>
                    {copied ? <><Check className="h-4 w-4 mr-1" />Copied!</> : <><Copy className="h-4 w-4 mr-1" />Copy Link</>}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========= Email ========= */}
          {activeTab === 'email' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Send via Email</h3>
                <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={handleAiDraft} disabled={generatingDraft}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {generatingDraft ? 'Generating...' : 'AI Generate Draft'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="share-email-to">To *</Label>
                  <Input id="share-email-to" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@example.com" />
                </div>
                <div>
                  <Label htmlFor="share-email-cc">CC</Label>
                  <Input id="share-email-cc" type="email" value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="cc@example.com" />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="share-email-subject">Subject</Label>
                <Input id="share-email-subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
              </div>

              <div className="mb-4">
                <Label htmlFor="share-email-body">Message</Label>
                <Textarea id="share-email-body" value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} />
              </div>

              {/* Attachments Section */}
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50/50 mb-4">
                <Label className="text-sm font-semibold">
                  Attachments {totalAttachments > 0 && <Badge variant="outline" className="ml-1">{totalAttachments} file{totalAttachments > 1 ? 's' : ''}</Badge>}
                </Label>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="share-attach-file" checked={attachFile} onChange={e => setAttachFile(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                  <label htmlFor="share-attach-file" className="text-sm flex items-center gap-1.5 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5 text-gray-500" />
                    <span>{item.original_name}</span>
                    <span className="text-xs text-gray-400">({formatFileSize(item.file_size)})</span>
                  </label>
                </div>

                {selectedAdditionalIds.length > 0 && (
                  <div className="space-y-1.5 pl-6">
                    {sameProductLineItems.filter(x => selectedAdditionalIds.includes(x.id)).map(x => (
                      <div key={x.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked onChange={() => toggleAdditional(x.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        <span>{x.original_name}</span>
                        <span className="text-xs text-gray-400">({formatFileSize(x.file_size)})</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.product_line_id ? (
                  !showAttachMore ? (
                    <Button variant="ghost" size="sm" className="text-indigo-600" onClick={loadRelatedCollateral}>
                      <Plus className="h-4 w-4 mr-1" />Attach more from {item.product_line_name || 'same product line'}
                    </Button>
                  ) : (
                    <div className="border rounded-lg p-3 bg-white max-h-60 overflow-y-auto space-y-1.5">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        Other collateral in {item.product_line_name || 'same product line'}:
                      </p>
                      {loadingRelated ? <p className="text-sm text-gray-500">Loading...</p>
                        : sameProductLineItems.length === 0 ? <p className="text-sm text-gray-500">No other collateral found.</p>
                        : sameProductLineItems.map(x => (
                          <div key={x.id} className="flex items-center gap-2 text-sm hover:bg-gray-50 rounded px-2 py-1.5 cursor-pointer" onClick={() => toggleAdditional(x.id)}>
                            <input type="checkbox" checked={selectedAdditionalIds.includes(x.id)} onChange={() => {}} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="flex-1">{x.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{x.category_name}</Badge>
                            <span className="text-xs text-gray-400 shrink-0">{formatFileSize(x.file_size)}</span>
                          </div>
                        ))}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-gray-400 italic">Assign a product line to enable attaching related collateral</p>
                )}
              </div>

              <Button onClick={handleSendEmail} disabled={sendingEmail || !emailTo} size="lg" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                {sendingEmail ? 'Sending...' : `Send Email${totalAttachments > 0 ? ` (${totalAttachments} attachment${totalAttachments > 1 ? 's' : ''})` : ''}`}
              </Button>
            </div>
          )}

          {/* ========= WhatsApp ========= */}
          {activeTab === 'whatsapp' && (
            <div className="max-w-xl space-y-4">
              <h3 className="text-lg font-semibold">Share via WhatsApp</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
                <Paperclip className="h-4 w-4 mt-0.5 shrink-0" />
                <span>The file <strong>{item.original_name}</strong> ({formatFileSize(item.file_size)}) will be downloaded first, then WhatsApp will open. Attach the downloaded file in the WhatsApp chat.</span>
              </div>
              <div>
                <Label htmlFor="share-wa-phone">Phone Number *</Label>
                <Input id="share-wa-phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="9876543210" className="max-w-xs" />
                <p className="text-xs text-gray-500 mt-1">Indian numbers (10 digit) auto-get +91 prefix</p>
              </div>
              <div>
                <Label htmlFor="share-wa-msg">Message</Label>
                <Textarea id="share-wa-msg" value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={6} />
              </div>
              <Button onClick={handleWhatsApp} disabled={!phoneNumber || sharingWa} size="lg" style={{ backgroundColor: '#25D366' }} className="text-white">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {sharingWa ? 'Preparing file...' : 'Share on WhatsApp'}
              </Button>
              <p className="text-xs text-gray-400">File downloads first, then WhatsApp opens. Attach the file using the paperclip icon in WhatsApp.</p>
            </div>
          )}

          {/* ========= SMS ========= */}
          {activeTab === 'sms' && (
            <div className="max-w-xl space-y-4">
              <h3 className="text-lg font-semibold">Share via SMS</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
                <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
                <span>A public download link will be included in the message for the recipient.</span>
              </div>
              <div>
                <Label htmlFor="share-sms-phone">Phone Number *</Label>
                <Input id="share-sms-phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="9876543210" className="max-w-xs" />
              </div>
              <div>
                <Label htmlFor="share-sms-msg">Message</Label>
                <Textarea id="share-sms-msg" value={smsMessage} onChange={e => setSmsMessage(e.target.value)} rows={6} />
              </div>
              <Button onClick={handleSMS} disabled={!phoneNumber} size="lg">
                <Send className="h-4 w-4 mr-2" />Open SMS
              </Button>
            </div>
          )}

          {/* ========= Social Media ========= */}
          {activeTab === 'social' && (
            <div className="max-w-xl space-y-5">
              <h3 className="text-lg font-semibold">Share on Social Media</h3>
              <p className="text-sm text-gray-500">Share this collateral on your social media channels. A public link will be included automatically.</p>
              {shareLink ? (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center gap-3" onClick={() => handleSocial('linkedin')}>
                    <svg className="w-10 h-10 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    <span className="font-medium text-sm">LinkedIn</span>
                  </Card>
                  <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center gap-3" onClick={() => handleSocial('twitter')}>
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span className="font-medium text-sm">X (Twitter)</span>
                  </Card>
                  <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow flex flex-col items-center gap-3" onClick={() => handleSocial('facebook')}>
                    <svg className="w-10 h-10 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="font-medium text-sm">Facebook</span>
                  </Card>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Generating share link...</p>
              )}
            </div>
          )}

          {/* ========= Share History (full page) ========= */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Share History</h3>
                <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
                  {loadingHistory ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              ) : shareHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No sharing history yet for this item.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Shared By</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Recipient</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Attachment</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shareHistory.map((h: any) => (
                        <tr key={h.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">{h.channel.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{h.shared_by_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{h.recipient_info || '-'}</td>
                          <td className="px-4 py-3">
                            {h.sent_as_attachment ? <Badge className="bg-green-100 text-green-700 text-xs">Yes</Badge> : <span className="text-gray-400">No</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
