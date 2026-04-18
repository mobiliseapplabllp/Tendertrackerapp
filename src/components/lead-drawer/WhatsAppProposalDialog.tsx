import { useState, useEffect } from 'react';
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
import { Loader2, Sparkles, Download, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { proposalApi } from '../../lib/api';

interface WhatsAppProposalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
  lead?: any;
}

export function WhatsAppProposalDialog({ isOpen, onClose, proposal, lead }: WhatsAppProposalDialogProps) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && proposal) {
      setPhone('');
      setMessage('');
      setPdfDownloaded(false);
      setStatus(null);
      handleGenerateDraft();
    }
  }, [isOpen, proposal?.id]);

  const handleGenerateDraft = async () => {
    if (!proposal?.id) return;
    setGenerating(true);
    try {
      const res = await proposalApi.aiWhatsAppDraft(proposal.id);
      if (res.success && res.data) {
        setMessage(res.data.message || '');
      }
    } catch (err) {
      console.error('Error generating draft:', err);
      // Fallback message
      setMessage(
        `*Proposal: ${proposal?.title}*\n\nTotal: ₹${Number(proposal?.grand_total || 0).toLocaleString('en-IN')}\n\nPlease find the attached proposal PDF for your review.`
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposal?.id) return;
    setDownloading(true);
    try {
      await proposalApi.generatePDF(proposal.id);
      setPdfDownloaded(true);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!message.trim()) {
      setStatus({ type: 'error', message: 'Message cannot be empty' });
      return;
    }

    // Clean phone number - remove spaces, dashes, and ensure it has country code
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with 91 (India default)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.substring(1);
    }
    // If doesn't start with + or country code, prepend 91
    if (cleanPhone && !cleanPhone.startsWith('+') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    // Remove + if present
    cleanPhone = cleanPhone.replace(/^\+/, '');

    const encodedMessage = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(url, '_blank');
    setStatus({ type: 'success', message: 'WhatsApp opened! Share the downloaded PDF as an attachment in the chat.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send via WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Proposal Info Banner */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">{proposal?.title}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {proposal?.proposal_type} &middot; v{proposal?.current_version}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-green-900">
                ₹{Number(proposal?.grand_total || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-green-600">Grand Total</p>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label className="text-xs font-medium">Phone Number <span className="text-gray-400">(with country code)</span></Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="text-sm mt-1"
            />
            <p className="text-xs text-gray-400 mt-0.5">Leave empty to choose contact in WhatsApp</p>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium">Message</Label>
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
                {generating ? 'Generating...' : 'AI Generate'}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your WhatsApp message..."
              className="text-sm mt-1 min-h-[200px] font-[inherit] leading-relaxed"
              rows={10}
            />
            <p className="text-xs text-gray-400 mt-1">
              Use *text* for bold in WhatsApp. The message will be pre-filled in WhatsApp.
            </p>
          </div>

          {/* PDF Download Section */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-900">Proposal PDF</p>
                <p className="text-xs text-amber-600 mt-0.5">Download first, then share as attachment in WhatsApp</p>
              </div>
              <Button
                size="sm"
                variant={pdfDownloaded ? "outline" : "default"}
                onClick={handleDownloadPDF}
                disabled={downloading}
                className={`text-xs gap-1 ${pdfDownloaded ? 'text-green-700 border-green-300 bg-green-50' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {downloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : pdfDownloaded ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {downloading ? 'Downloading...' : pdfDownloaded ? 'Downloaded' : 'Download PDF'}
              </Button>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {status.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} className="text-sm">
              Cancel
            </Button>
            <Button
              onClick={handleOpenWhatsApp}
              disabled={!message.trim()}
              className="text-sm gap-1.5"
              style={{ backgroundColor: '#25D366', color: '#fff' }}
            >
              <ExternalLink className="w-4 h-4" />
              Open in WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
