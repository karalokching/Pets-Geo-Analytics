import React, { useState, useEffect, useMemo } from 'react';
import { SalesRecord, DistrictStat, AnalysisTab } from './types';
import { parseCSV, aggregateByDistrict, aggregateBySubDistrict } from './services/parser';
import { initializeGemini } from './services/gemini';
import Dashboard from './components/Dashboard';
import GeminiExplorer from './components/GeminiExplorer';
import DataTable from './components/DataTable';
import MapView from './components/MapView';
import MetricsCard from './components/MetricsCard';

const SAMPLE_CSV_SNIPPET = `XF_PLU,XF_QTY,XF_AMT,XF_SALESMAN1,XF_CUSTOMERADDR4,XF_DELIVERYDATE,XF_SALESITEMREMARK,XF_VIPCODE,District,Subdistrict
MM560092,-1,529,SHOP09,土瓜灣浙江街22號同順興大廈4樓409室,2025-12-05,DW,V1001,九龍城,土瓜灣
JR21742,-2,587.4,S00337,紅磡海逸豪園16座8樓B室,2025-12-03,S,V1002,九龍城,紅磡
PKT80386,-2,264.1,S00337,紅磡海逸豪園16座8樓B室,2025-12-03,S,V1002,九龍城,紅磡
DCS54791,-2,266.9,S03045,旺角上海街646號黃金大廈7樓E室(電梯6字),2025-12-03,S,,油尖旺,旺角
ZCA00033,-2,864.1,S03045,彩虹利安道32號順利紀律部隊宿舍8座12樓H室,2025-12-04,S,V1003,觀塘,彩虹
Z9208881,-1,368.9,S03045,元郎八鄉石湖塘309C2樓(放地下門口),2025-12-09,S,,元朗,八鄉
MM560054,-4,1852.9,S02660,啟德啟欣苑啟潤閣40樓21室,2025-12-06,DW,V1004,九龍城,啟德
AD21503,-2,353.4,S02660,旺角海庭道16號富榮花園第二座17樓J室,2025-12-06,DW,,油尖旺,旺角
Z90678441,-2,521.6,S02660,油塘高怡村高志樓609室,2025-12-03,S,V1005,觀塘,油塘
BV00404,-4,127.2,S03045,美孚新村吉利徑9號13樓B座,2025-12-04,S,,深水埗,美孚`;

const App: React.FC = () => {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [districtStats, setDistrictStats] = useState<DistrictStat[]>([]);
  const [subDistrictStats, setSubDistrictStats] = useState<DistrictStat[]>([]);
  const [activeTab, setActiveTab] = useState<AnalysisTab>(AnalysisTab.DASHBOARD);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeGemini();
  }, []);

  // Memoize summary statistics
  const summary = useMemo(() => {
    const totalSales = records.reduce((sum, r) => sum + r.amount, 0);
    const totalTxns = records.length;
    
    // Count unique customers based on VIP Code (if present) OR Address (fallback)
    const uniqueCustomerSet = new Set<string>();
    records.forEach(r => {
        if (r.vipCode && r.vipCode.trim() !== '') {
            uniqueCustomerSet.add(`VIP:${r.vipCode.trim()}`);
        } else {
            uniqueCustomerSet.add(`ADDR:${r.address.trim()}`);
        }
    });
    const uniqueCustomers = uniqueCustomerSet.size;

    const avgTicket = totalTxns > 0 ? totalSales / totalTxns : 0;
    const topDistrict = districtStats.length > 0 ? districtStats[0].district : 'N/A';
    
    return { totalSales, totalTxns, uniqueCustomers, avgTicket, topDistrict };
  }, [records, districtStats]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Use setTimeout to allow UI to render the processing state
      setTimeout(() => processData(text), 100);
    };
    reader.readAsText(file);
    // Reset the input so same file can be uploaded again if needed
    event.target.value = '';
  };

  const loadSampleData = () => {
      setIsProcessing(true);
      // Simulate delay for effect
      setTimeout(() => processData(SAMPLE_CSV_SNIPPET), 500);
  };

  const processData = (csvText: string) => {
    try {
        const parsedRecords = parseCSV(csvText);
        setRecords(parsedRecords);
        setDistrictStats(aggregateByDistrict(parsedRecords));
        setSubDistrictStats(aggregateBySubDistrict(parsedRecords));
        if (parsedRecords.length > 0) {
          setActiveTab(AnalysisTab.DASHBOARD);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to parse CSV. Please check the file format.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <i className="fas fa-paw text-white text-xl"></i>
             </div>
             <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  Q-Pets Geo-Analytics
                </h1>
                <p className="text-xs text-slate-400">Customer Location Intelligence Dashboard</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
             <button 
                onClick={loadSampleData}
                className="text-sm text-slate-400 hover:text-white transition-colors"
             >
                Load Sample
             </button>
             <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-blue-500/25 flex items-center hover:bg-blue-400">
               <i className="fas fa-upload mr-2"></i>
               Upload CSV
               <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricsCard 
             title="Total Sales" 
             value={`$${summary.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
             icon="fa-dollar-sign" 
             color="bg-emerald-500" 
          />
          <MetricsCard 
             title="Transactions" 
             value={summary.totalTxns.toLocaleString()} 
             icon="fa-receipt" 
             color="bg-blue-500" 
          />
          <MetricsCard 
             title="Unique Customers" 
             value={summary.uniqueCustomers.toLocaleString()} 
             icon="fa-users" 
             color="bg-orange-500" 
          />
           <MetricsCard 
             title="Avg. Ticket" 
             value={`$${summary.avgTicket.toFixed(1)}`} 
             icon="fa-chart-line" 
             color="bg-purple-500" 
          />
           <MetricsCard 
             title="Top District" 
             value={summary.topDistrict} 
             icon="fa-map-pin" 
             color="bg-rose-500" 
          />
        </div>

        {/* Navigation Tabs */}
        {records.length > 0 && (
          <div className="mb-6 flex space-x-1 bg-slate-800 p-1 rounded-lg w-fit overflow-x-auto">
            {[
                { id: AnalysisTab.DASHBOARD, label: 'Dashboard', icon: 'fa-chart-pie' },
                { id: AnalysisTab.MAP, label: 'Map View', icon: 'fa-map-marked-alt' },
                { id: AnalysisTab.AI_INSIGHTS, label: 'AI & Insights', icon: 'fa-robot' },
                { id: AnalysisTab.DATA, label: 'Raw Data', icon: 'fa-table' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AnalysisTab)}
                className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all flex items-center whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <div className="animate-fade-in">
            {records.length === 0 && !isProcessing && (
              <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-cloud-upload-alt text-3xl text-slate-400"></i>
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No Data Loaded</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-6">Upload a CSV file or load sample data to start analyzing customer locations.</p>
                <button 
                  onClick={loadSampleData}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-blue-500/25"
                >
                  Load Sample Data
                </button>
              </div>
            )}

            {isProcessing && (
                 <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700">
                    <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500 mb-4"></i>
                    <p className="text-white text-lg font-medium">Processing Data...</p>
                    <p className="text-slate-400 text-sm mt-2">Parsing CSV, identifying districts, and generating coordinates...</p>
                 </div>
            )}

            {!isProcessing && activeTab === AnalysisTab.DASHBOARD && records.length > 0 && (
              <Dashboard stats={districtStats} subDistrictStats={subDistrictStats} />
            )}

            {!isProcessing && activeTab === AnalysisTab.MAP && records.length > 0 && (
              <MapView records={records} />
            )}
            
            {!isProcessing && activeTab === AnalysisTab.DATA && records.length > 0 && (
              <DataTable records={records} />
            )}

            {!isProcessing && activeTab === AnalysisTab.AI_INSIGHTS && records.length > 0 && (
              <GeminiExplorer records={records} districtStats={districtStats} />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;