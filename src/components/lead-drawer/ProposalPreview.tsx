import { useBranding } from '../../hooks/useBranding';
import { useSettings } from '../../hooks/useSettings';

interface ProposalPreviewProps {
  data: {
    title?: string;
    proposalId?: string;
    date?: string;
    version?: string;
    clientName?: string;
    clientCompany?: string;
    clientAddress?: string;
    coverLetter?: string;
    executiveSummary?: string;
    scopeOfWork?: string;
    oneTimeItems?: any[];
    recurringItems?: any[];
    notes?: string;
    termsConditions?: string;
    paymentTerms?: string;
    warrantyTerms?: string;
    validityDays?: number;
    submitterName?: string;
    submitterEmail?: string;
    submitterPhone?: string;
    companyName?: string;
    companyEmail?: string;
    companyPhone?: string;
  };
}

export function ProposalPreview({ data }: ProposalPreviewProps) {
  const { appName } = useBranding();
  const { formatCurrency } = useSettings();

  const oneTimeTotal = (data.oneTimeItems || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const recurringTotal = (data.recurringItems || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
  const taxRate = 18;
  const oneTimeTax = oneTimeTotal * (taxRate / 100);
  const recurringTax = recurringTotal * (taxRate / 100);

  return (
    <div className="bg-white border rounded-lg shadow-md overflow-y-auto text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-t-lg" />

      {/* Page 1 - Proposal Document */}
      <div className="p-6 min-h-[600px]">
        {/* Header */}
        <div className="pb-4 mb-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-500 font-semibold mb-1">Proposal Document</p>
              <h1 className="text-base font-bold text-gray-900">{data.title || 'Untitled Proposal'}</h1>
            </div>
            <div className="text-right">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mb-1 ml-auto">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <p className="text-[9px] text-gray-500">{data.companyName || appName}</p>
            </div>
          </div>
          <div className="flex gap-6 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-400 rounded-full"></span>Dated: {data.date || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-400 rounded-full"></span>ID: {data.proposalId || '---'}</span>
            <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-400 rounded-full"></span>Version: {data.version || '01'}</span>
          </div>
        </div>

        {/* Client + Submitter Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {(data.clientName || data.clientCompany) && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[9px] uppercase tracking-wider text-indigo-500 font-semibold mb-1.5">Submitted To</p>
              <p className="font-semibold text-gray-900">{data.clientName || '---'}</p>
              {data.clientCompany && <p className="text-gray-600">{data.clientCompany}</p>}
              {data.clientAddress && <p className="text-gray-400 text-[10px] mt-0.5">{data.clientAddress}</p>}
            </div>
          )}
          {(data.submitterName || data.companyName) && (
            <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
              <p className="text-[9px] uppercase tracking-wider text-indigo-500 font-semibold mb-1.5">Submitted By</p>
              {data.submitterName && <p className="font-semibold text-gray-900">{data.submitterName}</p>}
              {data.companyName && <p className="text-gray-600">{data.companyName}</p>}
              <div className="text-[10px] text-gray-400 mt-0.5">
                {data.submitterEmail && <span>{data.submitterEmail}</span>}
                {data.submitterPhone && <span> | {data.submitterPhone}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Cover Letter */}
        {data.coverLetter && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-indigo-500">Cover Letter</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.coverLetter}</div>
          </div>
        )}

        {/* Executive Summary */}
        {data.executiveSummary && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-indigo-500">Executive Summary</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.executiveSummary}</div>
          </div>
        )}

        {/* Scope of Work */}
        {data.scopeOfWork && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-indigo-500">Scope of Work</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.scopeOfWork}</div>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-amber-500">Notes</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.notes}</div>
          </div>
        )}
      </div>

      {/* Page 2 - Cost Proposal */}
      <div className="p-6 border-t border-gray-200">
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-500 font-semibold mb-0.5">Commercial</p>
          <h2 className="text-base font-bold text-gray-900">Cost Proposal</h2>
        </div>

        {/* [A] One-Time Charges */}
        {(data.oneTimeItems || []).length > 0 && (
          <div className="mb-4">
            <p className="font-semibold mb-1">[A] One-Time Charges</p>
            <table className="w-full border border-gray-300 text-[10px]">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left w-8">SL</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Item Description</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-16">Rate</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-10">Qty</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.oneTimeItems || []).map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.unitPrice, undefined, { compact: false })}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice, undefined, { compact: false })}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">Subtotal</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(oneTimeTotal, undefined, { compact: false })}</td>
                </tr>
                <tr className="text-gray-500">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">GST @ {taxRate}%</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(oneTimeTax, undefined, { compact: false })}</td>
                </tr>
                <tr className="bg-indigo-50 font-bold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">Total (incl. GST)</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(oneTimeTotal + oneTimeTax, undefined, { compact: false })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* [B] Recurring Charges */}
        {(data.recurringItems || []).length > 0 && (
          <div className="mb-4">
            <p className="font-semibold mb-1">[B] Recurring Charges (Annual)</p>
            <table className="w-full border border-gray-300 text-[10px]">
              <thead className="bg-amber-50">
                <tr>
                  <th className="border border-gray-300 px-2 py-1 text-left w-8">SL</th>
                  <th className="border border-gray-300 px-2 py-1 text-left">Item Description</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-16">Charges</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-10">Qty</th>
                  <th className="border border-gray-300 px-2 py-1 text-right w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.recurringItems || []).map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                    <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.unitPrice, undefined, { compact: false })}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right">{item.quantity}</td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice, undefined, { compact: false })}</td>
                  </tr>
                ))}
                <tr className="bg-amber-50 font-semibold">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">Annual Total</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(recurringTotal, undefined, { compact: false })}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[9px] text-gray-500 mt-1 italic">* Yearly charges applicable from Year 2 onwards, charged on annual basis</p>
          </div>
        )}

        {/* T&C */}
        {data.termsConditions && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-gray-400">Terms & Conditions</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.termsConditions}</div>
          </div>
        )}

        {/* Payment Terms */}
        {data.paymentTerms && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-green-500">Payment Terms</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.paymentTerms}</div>
          </div>
        )}

        {/* Warranty */}
        {data.warrantyTerms && (
          <div className="mb-4">
            <p className="font-semibold text-gray-800 mb-1 pl-2 border-l-2 border-blue-500">Warranty & Support</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.warrantyTerms}</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-4 text-center text-[9px] text-gray-500">
            <p className="font-bold text-gray-700 text-[10px]">{data.companyName || appName}</p>
            <p className="mt-0.5">62B, HSIIDC, Sector 31, Faridabad, Haryana, INDIA</p>
            <div className="flex justify-center gap-4 mt-1">
              {data.companyEmail && <span>Email: {data.companyEmail}</span>}
              {data.companyPhone && <span>Phone: {data.companyPhone}</span>}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-[9px]">
              <span>Valid for {data.validityDays || 30} days from date of issue</span>
              {data.submitterName && <span>Prepared by: <strong>{data.submitterName}</strong></span>}
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500 rounded-b-lg mt-4" />
        </div>
      </div>
    </div>
  );
}
