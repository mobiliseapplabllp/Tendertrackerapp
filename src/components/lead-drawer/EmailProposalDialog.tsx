import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2, Send, Sparkles, Mail, CheckCircle, AlertCircle, Paperclip, X } from 'lucide-react';
import { proposalApi } from '../../lib/api';

interface EmailProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
  lead?: any;
  onSent?: () => void;
}

export function EmailProposalDialog({ isOpen, onClose, proposal, lead, onSent }: EmailProposalDialogProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [markAsSubmitted, setMarkAsSubmitted] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [attachPdf, setAttachPdf] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-populate when dialog opens
  useEffect(() => {
    if (isOpen && proposal) {
      // Pre-fill To with submitted_to_email or lead's contact email
      const preEmail = proposal.submitted_to_email || lead?.contact_email || '';
      setTo(preEmail);
      setCc('');
      setSubject(`Proposal: ${proposal.title}`);
      setBody('');
      setMarkAsSubmitted(proposal.status === 'Approved');
      setStatus(null);
      setAttachPdf(true);
      setAttachments([]);

      // Auto-generate draft on open
      handleGenerateDraft();
    }
  }, [isOpen, proposal?.id]);

  const handleGenerateDraft = async () => {
    if (!proposal?.id) return;
    setGenerating(true);
    try {
      const res = await proposalApi.aiEmailDraft(proposal.id);
      if (res.success && res.data) {
        setSubject(res.data.subject || subject);
        setBody(res.data.body || '');
        if (res.data.suggestedTo && !to) {
          setTo(res.data.suggestedTo);
        }
      }
    } catch (err) {
      console.error('Error generating draft:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) {
      setStatus({ type: 'error', message: 'Recipient email is required' });
      return;
    }
    if (!subject.trim()) {
      setStatus({ type: 'error', message: 'Subject is required' });
      return;
    }
    if (!body.trim()) {
      setStatus({ type: 'error', message: 'Email body is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }
    if (cc.trim() && !cc.split(',').every(e => emailRegex.test(e.trim()))) {
      setStatus({ type: 'error', message: 'Please enter valid CC email addresses (comma-separated)' });
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      const res = await proposalApi.sendEmail(proposal.id, {
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        markAsSubmitted,
        attachPdf,
        attachments,
      });
      if (res.success) {
        setStatus({ type: 'success', message: 'Email sent successfully!' });
        setTimeout(() => {
          onSent?.();
          onClose();
        }, 1500);
      } else {
        setStatus({ type: 'error', message: res.error || 'Failed to send email' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="w-5 h-5 text-indigo-600" />
            Email Proposal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Proposal Info Banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-900">{proposal?.title}</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {proposal?.proposal_type} &middot; v{proposal?.current_version}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-900">
                ₹{Number(proposal?.grand_total || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-indigo-600">Grand Total</p>
            </div>
          </div>

          {/* To Field */}
          <div>
            <Label className="text-xs font-medium">To <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@example.com"
              className="text-sm mt-1"
            />
          </div>

          {/* CC Field */}
          <div>
            <Label className="text-xs font-medium">CC <span className="text-gray-400">(optional)</span></Label>
            <Input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="manager@example.com, team@example.com"
              className="text-sm mt-1"
            />
            <p className="text-xs text-gray-400 mt-0.5">Separate multiple emails with commas</p>
          </div>

          {/* Subject Field */}
          <div>
            <Label className="text-xs font-medium">Subject <span className="text-red-500">*</span></Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Proposal: ..."
              className="text-sm mt-1"
            />
          </div>

          {/* Body Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium">Email Body <span className="text-red-500">*</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateDraft}
                disabled={generating}
                className="h-7 text-xs gap-1"
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
                {generating ? 'Generating...' : 'AI Generate Draft'}
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="text-sm mt-1 min-h-[240px] font-[inherit] leading-relaxed"
              rows={12}
            />
            <p className="text-xs text-gray-400 mt-1">
              The email will include a professional header with your company branding, proposal details, and pricing summary automatically.
            </p>
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Attachments</Label>

            {/* PDF Attachment Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 border border-indigo-100 rounded-lg p-2.5">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={(e) => setAttachPdf(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5 flex-1">
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>
                <span className="text-sm text-indigo-900 font-medium">Attach Proposal PDF</span>
              </div>
              <span className="text-xs text-indigo-500">Auto-generated</span>
            </label>

            {/* Additional Files */}
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2 text-sm">
                    <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate flex-1 text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
                    <button onClick={() => removeAttachment(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs gap-1"
            >
              <Paperclip className="w-3 h-3" />
              Add Additional Files
            </Button>
          </div>

          {/* Mark as Submitted Checkbox */}
          {proposal?.status === 'Approved' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={markAsSubmitted}
                onChange={(e) => setMarkAsSubmitted(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                Mark proposal as "Submitted" after sending
              </span>
            </label>
          )}

          {/* Status Message */}
          {status && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {status.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {status.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={sending} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 gap-1.5"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
