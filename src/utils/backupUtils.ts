export interface BackupData {
  version: string;
  timestamp: string;
  appName: string;
  modules: {
    products?: any[];
    clients?: any[];
    suppliers?: any[];
    orders?: any[];
    deliveryNotes?: any[];
    invoices?: any[];
    chequesEffets?: any[];
    expenses?: any[];
    frigos?: any[];
    stocks?: any[];
    inventoryCounts?: any[];
    purchaseInvoices?: any[];
    companyInfo?: any;
  };
}

export function exportFullBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `easyerp-backup-${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const data = JSON.parse(result) as BackupData;
          resolve(data);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function validateBackupIntegrity(data: BackupData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.version) {
    errors.push('Missing version field');
  }
  if (!data.timestamp) {
    errors.push('Missing timestamp field');
  }
  if (!data.appName) {
    errors.push('Missing appName field');
  } else if (data.appName !== 'EasyERP Pro') {
    errors.push('Invalid appName. Expected "EasyERP Pro"');
  }
  
  if (!data.modules || typeof data.modules !== 'object') {
    errors.push('Missing or invalid modules field');
    return { isValid: false, errors };
  }

  let hasData = false;
  const arrayModules = [
    'products', 'clients', 'suppliers', 'orders', 'deliveryNotes', 
    'invoices', 'chequesEffets', 'expenses', 'frigos', 'stocks', 
    'inventoryCounts', 'purchaseInvoices'
  ];

  for (const mod of arrayModules) {
    const modData = data.modules[mod as keyof typeof data.modules];
    if (modData !== undefined) {
      hasData = true;
      if (!Array.isArray(modData)) {
        errors.push(`Module ${mod} is not an array`);
      }
    }
  }

  if (data.modules.companyInfo !== undefined) {
    hasData = true;
    if (typeof data.modules.companyInfo !== 'object' || Array.isArray(data.modules.companyInfo)) {
      errors.push('Module companyInfo is not an object');
    }
  }

  if (!hasData) {
    errors.push('No module data found in the backup');
  }

  return { isValid: errors.length === 0, errors };
}
