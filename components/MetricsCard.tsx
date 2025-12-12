import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 flex items-center">
      <div className={`p-4 rounded-full ${color} bg-opacity-20 mr-4`}>
        <i className={`fas ${icon} text-2xl ${color.replace('bg-', 'text-')}`}></i>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  );
};

export default MetricsCard;
