import { SalesRecord, DistrictStat } from '../types';
import { DISTRICT_COORDINATES } from './coordinates';

// Expanded Heuristic list of HK districts/areas for categorization
// Includes common typos (e.g., 元郎) and specific housing estates/areas
const HK_DISTRICTS = [
  // New Territories West
  "屯門", "元朗", "元郎", "天水圍", "荃灣", "葵涌", "青衣", "深井", "洪水橋", "流浮山", "大窩口", "葵興", "葵芳", "荔景", "青龍頭", "小欖", "掃管笏", "錦田", "八鄉",
  // New Territories East
  "沙田", "大圍", "火炭", "馬鞍山", "大埔", "粉嶺", "上水", "石門", "九肚山", "科學園", "太和", "馬料水",
  // Sai Kung / TKO
  "西貢", "將軍澳", "康城", "清水灣", "坑口", "寶琳", "寶林", "調景嶺",
  // Kowloon West
  "尖沙咀", "油麻地", "佐敦", "旺角", "太子", "大角咀", "深水埗", "深水步", "長沙灣", "荔枝角", "美孚", "石硤尾", "南昌", "奧運", "九龍塘", "何文田", "蘇屋", "白田",
  // Kowloon East
  "紅磡", "土瓜灣", "馬頭圍", "九龍城", "黃大仙", "慈雲山", "鑽石山", "新蒲崗", "彩虹", "牛頭角", "九龍灣", "觀塘", "藍田", "油塘", "樂富", "彩雲", "坪石", "秀茂坪", "鯉魚門", "啟德", "牛池灣", "佐敦谷",
  // HK Island West/Central
  "中環", "上環", "西環", "堅尼地城", "石塘咀", "西營盤", "薄扶林", "山頂", "半山",
  // HK Island East/Wan Chai
  "灣仔", "銅鑼灣", "跑馬地", "大坑", "北角", "鰂魚涌", "魚則魚涌", "太古", "西灣河", "筲箕灣", "柴灣", "小西灣", "炮台山", "天后",
  // HK Island South
  "香港仔", "鴨脷洲", "鴨利洲", "黃竹坑", "淺水灣", "赤柱", "石澳", "數碼港", "深水灣",
  // Outlying
  "東涌", "愉景灣", "馬灣", "珀麗灣", "長洲", "坪洲", "南丫島", "大嶼山"
];

const cleanAmount = (amt: string): number => {
  return parseFloat(amt) || 0;
};

const extractDistrictFromAddress = (address: string): string => {
  if (!address) return "其他/未知";
  
  // Normalize address string
  const normalizedAddr = address.replace(/\s+/g, '');

  for (const dist of HK_DISTRICTS) {
    if (normalizedAddr.includes(dist)) {
      // Return normalized district name for aggregation
      if (dist === "元郎") return "元朗";
      if (dist === "鴨利洲") return "鴨脷洲";
      if (dist === "深水步") return "深水埗";
      if (dist === "魚則魚涌") return "鰂魚涌";
      if (dist === "寶林") return "寶琳";
      return dist;
    }
  }
  return "其他/未知";
};

// Function to get jittered coordinates based on district
const getEstimatedCoordinates = (locationName: string) => {
    // Try exact match first
    let center = DISTRICT_COORDINATES[locationName];
    
    // If not found, try to find partial match in keys (e.g. "North Point" finding "North Point")
    // Or handle aliases if needed. 
    // If explicit subdistrict is unknown, fallback to "Unknown" center.
    if (!center) {
        // Fallback: try mapping aliases again just in case
        const normalized = extractDistrictFromAddress(locationName);
        center = DISTRICT_COORDINATES[normalized];
    }

    if (!center) {
        center = DISTRICT_COORDINATES["其他/未知"];
    }

    // Add small random jitter (approx +/- 200m) to simulate distribution and prevent overlap
    const jitterLat = (Math.random() - 0.5) * 0.004;
    const jitterLng = (Math.random() - 0.5) * 0.004;
    return {
        lat: center.lat + jitterLat,
        lng: center.lng + jitterLng
    };
};

// Robust CSV Parser handling quotes and newlines within fields
export const parseCSV = (csvText: string): SalesRecord[] => {
  const records: SalesRecord[] = [];
  
  // Remove BOM if present
  let text = csvText.replace(/^\uFEFF/, '');
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  
  // Add last row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Dynamic Column Mapping
  let colMap = {
      plu: 0,
      qty: 1,
      amount: 2,
      salesman: 3,
      address: 4,
      date: 5,
      remark: 6,
      vipCode: -1,
      district: -1,
      subDistrict: -1
  };
  
  let headerFound = false;
  let startRow = 0;

  // Search for header row to determine column indices dynamically
  for(let i=0; i<Math.min(rows.length, 20); i++) {
      const rowUpper = rows[i].map(c => c.toUpperCase().trim());
      // Check for key columns (PLU and Amount are mandatory landmarks)
      if (rowUpper.some(col => col.includes('XF_PLU') || col.includes('PLU')) && 
          rowUpper.some(col => col.includes('XF_AMT') || col.includes('AMOUNT'))) {
          
          headerFound = true;
          startRow = i + 1;
          
          rowUpper.forEach((col, idx) => {
              if (col.includes('XF_PLU') || col === 'PLU') colMap.plu = idx;
              if (col.includes('XF_QTY') || col === 'QTY') colMap.qty = idx;
              if (col.includes('XF_AMT') || col.includes('AMOUNT')) colMap.amount = idx;
              if (col.includes('XF_SALESMAN') || col.includes('SALESMAN')) colMap.salesman = idx;
              if (col.includes('XF_CUSTOMERADDR') || col.includes('ADDRESS') || col.includes('ADDR')) colMap.address = idx;
              if (col.includes('XF_DELIVERYDATE') || col.includes('DATE')) colMap.date = idx;
              if (col.includes('XF_SALESITEMREMARK') || col.includes('REMARK')) colMap.remark = idx;
              if (col.includes('XF_VIPCODE') || col === 'VIPCODE' || col === 'VIP') colMap.vipCode = idx;
              
              // New District Columns
              if (col === 'DISTRICT' || col === 'XF_DISTRICT' || col === '地區') colMap.district = idx;
              if (col === 'SUBDISTRICT' || col === 'SUB_DISTRICT' || col === '分區' || col === 'SUB-DISTRICT') colMap.subDistrict = idx;
          });
          break;
      }
  }

  for (let i = startRow; i < rows.length; i++) {
    const columns = rows[i];
    const requiredMaxIndex = Math.max(colMap.plu, colMap.amount, colMap.address);
    if (columns.length <= requiredMaxIndex) continue;

    const plu = columns[colMap.plu]?.trim() || '';
    const qty = parseInt(columns[colMap.qty]?.trim()) || 0;
    const amount = cleanAmount(columns[colMap.amount]?.trim());
    const salesman = columns[colMap.salesman]?.trim() || '';
    const address = columns[colMap.address]?.trim() || '';
    const date = columns[colMap.date]?.trim() || '';
    const remark = columns[colMap.remark]?.trim() || '';
    const vipCode = colMap.vipCode > -1 ? columns[colMap.vipCode]?.trim() : undefined;
    
    // Explicit District Data
    const csvDistrict = colMap.district > -1 ? columns[colMap.district]?.trim() : '';
    const csvSubDistrict = colMap.subDistrict > -1 ? columns[colMap.subDistrict]?.trim() : '';

    // Filter out completely empty rows
    if (!plu && !address && !amount) continue;

    // Logic: 
    // 1. Use explicit District column if available.
    // 2. If not, fallback to extracting from address.
    let finalDistrict = '';
    if (csvDistrict && csvDistrict !== 'Unknown' && csvDistrict !== '') {
        finalDistrict = csvDistrict;
    } else {
        finalDistrict = extractDistrictFromAddress(address);
    }

    // Logic for Coordinates:
    // 1. Explicit Subdistrict is most precise.
    // 2. Explicit District is next.
    // 3. Fallback heuristic district.
    let lat = 0;
    let lng = 0;
    
    // Attempt lookup with subdistrict first
    if (csvSubDistrict && DISTRICT_COORDINATES[csvSubDistrict]) {
        const coords = getEstimatedCoordinates(csvSubDistrict);
        lat = coords.lat;
        lng = coords.lng;
    } 
    // Fallback to district lookup
    else if (finalDistrict && DISTRICT_COORDINATES[finalDistrict]) {
        const coords = getEstimatedCoordinates(finalDistrict);
        lat = coords.lat;
        lng = coords.lng;
    } 
    // Fallback to address heuristic (if finalDistrict was derived from address)
    else {
        const extracted = extractDistrictFromAddress(address);
        const coords = getEstimatedCoordinates(extracted);
        lat = coords.lat;
        lng = coords.lng;
    }

    records.push({
      id: `rec-${i}`,
      plu,
      qty,
      amount,
      salesman,
      address,
      date,
      remark,
      district: finalDistrict,
      subDistrict: csvSubDistrict,
      vipCode,
      lat,
      lng
    });
  }

  return records;
};

export const aggregateByDistrict = (records: SalesRecord[]): DistrictStat[] => {
  const map = new Map<string, { 
    district: string; 
    totalSales: number; 
    transactionCount: number; 
    customerSet: Set<string>;
  }>();

  records.forEach(r => {
    const distName = r.district || "其他/未知";
    const current = map.get(distName) || { 
      district: distName, 
      totalSales: 0, 
      transactionCount: 0, 
      customerSet: new Set() 
    };
    
    current.totalSales += r.amount;
    current.transactionCount += 1;
    
    if (r.vipCode && r.vipCode.trim() !== '') {
      current.customerSet.add(`VIP:${r.vipCode.trim()}`);
    } else {
      current.customerSet.add(`ADDR:${r.address.trim()}`);
    }

    map.set(distName, current);
  });

  return Array.from(map.values()).map(stat => ({
    district: stat.district,
    totalSales: stat.totalSales,
    transactionCount: stat.transactionCount,
    uniqueCustomers: stat.customerSet.size
  })).sort((a, b) => b.totalSales - a.totalSales);
};

export const aggregateBySubDistrict = (records: SalesRecord[]): DistrictStat[] => {
  const map = new Map<string, { 
    district: string; 
    totalSales: number; 
    transactionCount: number; 
    customerSet: Set<string>;
  }>();

  records.forEach(r => {
    // Use SubDistrict if available, otherwise fallback to District
    const subDistName = r.subDistrict || r.district || "其他/未知";
    
    // If explicit subdistrict is just empty string and district is valid, we usually prefer district
    // But r.subDistrict comes from CSV column. 
    
    const current = map.get(subDistName) || { 
      district: subDistName, 
      totalSales: 0, 
      transactionCount: 0, 
      customerSet: new Set() 
    };
    
    current.totalSales += r.amount;
    current.transactionCount += 1;
    
    if (r.vipCode && r.vipCode.trim() !== '') {
      current.customerSet.add(`VIP:${r.vipCode.trim()}`);
    } else {
      current.customerSet.add(`ADDR:${r.address.trim()}`);
    }

    map.set(subDistName, current);
  });

  return Array.from(map.values()).map(stat => ({
    district: stat.district,
    totalSales: stat.totalSales,
    transactionCount: stat.transactionCount,
    uniqueCustomers: stat.customerSet.size
  })).sort((a, b) => b.totalSales - a.totalSales);
};