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
    <div className="bg-white border rounded-lg shadow-sm overflow-y-auto text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Page 1 - Proposal Document */}
      <div className="p-6 min-h-[600px]">
        {/* Header */}
        <div className="border-b-2 border-indigo-600 pb-3 mb-4">
          <h1 className="text-lg font-bold text-indigo-900">PROPOSAL DOCUMENT</h1>
          <div className="flex justify-between mt-2 text-[10px] text-gray-600">
            <span>Dated: {data.date || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Proposal ID: {data.proposalId || '---'}</span>
            <span>Version: {data.version || '01'}</span>
          </div>
        </div>

        {/* Client */}
        {(data.clientName || data.clientCompany) && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Submitted To:</p>
            <p className="font-semibold">{data.clientName || '---'}</p>
            {data.clientCompany && <p>{data.clientCompany}</p>}
            {data.clientAddress && <p className="text-gray-500">{data.clientAddress}</p>}
          </div>
        )}

        {/* Submitted By / From */}
        {(data.submitterName || data.companyName) && (
          <div className="mb-4 flex gap-6">
            {data.submitterName && (
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Submitted By:</p>
                <p className="font-semibold">{data.submitterName}</p>
                {data.submitterEmail && <p className="text-gray-600">{data.submitterEmail}</p>}
                {data.submitterPhone && <p className="text-gray-600">{data.submitterPhone}</p>}
              </div>
            )}
            {data.companyName && (
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">From:</p>
                <p className="font-semibold">{data.companyName}</p>
                {data.companyEmail && <p className="text-gray-600">{data.companyEmail}</p>}
                {data.companyPhone && <p className="text-gray-600">{data.companyPhone}</p>}
              </div>
            )}
          </div>
        )}

        {/* Cover Letter */}
        {data.coverLetter && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Cover Letter</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.coverLetter}</div>
          </div>
        )}

        {/* Executive Summary */}
        {data.executiveSummary && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Executive Summary</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.executiveSummary}</div>
          </div>
        )}

        {/* Scope of Work */}
        {data.scopeOfWork && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Scope of Work</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.scopeOfWork}</div>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Notes</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.notes}</div>
          </div>
        )}
      </div>

      {/* Page 2 - Cost Proposal */}
      <div className="p-6 border-t-2 border-gray-200">
        <h2 className="text-base font-bold text-indigo-900 mb-3">COST PROPOSAL</h2>

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
            <p className="font-semibold text-indigo-800 mb-1">Terms & Conditions</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.termsConditions}</div>
          </div>
        )}

        {/* Payment Terms */}
        {data.paymentTerms && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Payment Terms</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.paymentTerms}</div>
          </div>
        )}

        {/* Warranty */}
        {data.warrantyTerms && (
          <div className="mb-4">
            <p className="font-semibold text-indigo-800 mb-1">Warranty & Support</p>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.warrantyTerms}</div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500">
          <p className="font-semibold">{data.companyName || appName}</p>
          <p>62B, HSIIDC, Sector 31, Faridabad, Haryana, INDIA</p>
          <div className="flex justify-center gap-4 mt-0.5">
            {data.companyEmail && <span>Email: {data.companyEmail}</span>}
            {data.companyPhone && <span>Phone: {data.companyPhone}</span>}
          </div>
          <p className="mt-1">This proposal is valid for {data.validityDays || 30} days from the date of issue.</p>
          {data.submitterName && <p className="mt-1">Prepared by: {data.submitterName} | {data.submitterEmail}</p>}
        </div>
      </div>
    </div>
  );
}
