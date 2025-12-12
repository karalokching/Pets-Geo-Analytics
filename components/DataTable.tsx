import React from 'react';
import { SalesRecord } from '../types';

interface DataTableProps {
  records: SalesRecord[];
}

const DataTable: React.FC<DataTableProps> = ({ records }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 bg-slate-900 border-b border-slate-700">
        <h3 className="text-white font-semibold">Raw Sales Data</h3>
      </div>
      <div className="overflow-auto flex-1 scrollbar-thin">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs uppercase bg-slate-900 text-slate-200 sticky top-0">
            <tr>
              <th className="px-6 py-3">District</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 100).map((record, index) => (
              <tr key={index} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-3 text-blue-400 font-medium">{record.district}</td>
                <td className="px-6 py-3 truncate max-w-xs" title={record.address}>
                  {record.address}
                </td>
                <td className="px-6 py-3 text-right text-emerald-400">${record.amount}</td>
                <td className="px-6 py-3 text-right">{record.qty}</td>
                <td className="px-6 py-3">{record.date}</td>
              </tr>
            ))}
            {records.length > 100 && (
                <tr className="bg-slate-900/50">
                    <td colSpan={5} className="text-center py-4 text-slate-500 italic">
                        Showing first 100 of {records.length} records.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
