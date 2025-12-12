import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { DistrictStat } from '../types';

interface DashboardProps {
  stats: DistrictStat[];
  subDistrictStats?: DistrictStat[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded shadow-xl text-sm">
        <p className="font-bold text-white mb-1">{label}</p>
        <p className="text-blue-400">
          Sales: ${data.totalSales?.toLocaleString()}
        </p>
        <p className="text-emerald-400">
          Transactions: {data.transactionCount}
        </p>
        <p className="text-orange-400">
          Unique Customers: {data.uniqueCustomers}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ stats, subDistrictStats = [] }) => {
  const topDistricts = stats.slice(0, 10);
  const topSubDistricts = subDistrictStats.slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Sales by District Bar Chart */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <i className="fas fa-chart-bar text-blue-500 mr-2"></i>
          Top 10 Districts by Sales Revenue
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topDistricts as any[]}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
              <YAxis dataKey="district" type="category" stroke="#fff" width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalSales" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total Sales">
                <LabelList 
                  dataKey="uniqueCustomers" 
                  position="right" 
                  fill="#94a3b8" 
                  fontSize={12} 
                  formatter={(val: number) => `${val} cust.`} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* Sales by Sub-District Bar Chart */}
       <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <i className="fas fa-city text-purple-500 mr-2"></i>
          Top 10 Subdistricts by Sales Revenue
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topSubDistricts as any[]}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
              <YAxis dataKey="district" type="category" stroke="#fff" width={70} tick={{fontSize: 12}} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalSales" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Total Sales">
                <LabelList 
                  dataKey="uniqueCustomers" 
                  position="right" 
                  fill="#94a3b8" 
                  fontSize={12} 
                  formatter={(val: number) => `${val} cust.`} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transaction Count Pie Chart */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg lg:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
          <i className="fas fa-chart-pie text-emerald-500 mr-2"></i>
          Transaction Volume Distribution (Districts)
        </h3>
        <div className="h-[350px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topDistricts as any[]}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="transactionCount"
                nameKey="district"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {topDistricts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-0 right-0 text-xs text-slate-500 italic">
            * Top 10 districts shown
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;