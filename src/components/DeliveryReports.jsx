import React from 'react';
import { FaFileDownload } from 'react-icons/fa';

const mockReports = [
  { id: 'CMP-1001', name: 'Diwali Warm Leads', creditsUsed: 320 },
  { id: 'CMP-1002', name: 'Payment Reminder Batch', creditsUsed: 210 },
  { id: 'CMP-1003', name: 'Premium Upsell List', creditsUsed: 145 },
  { id: 'CMP-1004', name: 'WhatsApp Marketing', creditsUsed: 410 },
];

const DeliveryReports = () => {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
          <FaFileDownload className="h-3 w-3" />
          <span>Reports</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
          Delivery Reports
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Export campaign delivery stats and credit usage.
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                  Campaign ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                  Campaign Name
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                  Credits Used
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockReports.map((report) => (
                <tr key={report.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-zinc-900">{report.id}</td>
                  <td className="px-4 py-3 text-xs text-zinc-700">{report.name}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-600">{report.creditsUsed.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[11px] font-medium transition-colors">
                      <FaFileDownload size={12} />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReports;

