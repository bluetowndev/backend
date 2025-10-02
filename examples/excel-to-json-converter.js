/**
 * Example script to convert Excel data to JSON format for bulk import
 * This script shows how to convert your Excel file data to the required JSON format
 */

// Example Excel data structure (what you would get from reading an Excel file)
const excelData = [
  {
    'Field Engineer': 'john.doe@bluetown.com',
    'Target Sep\'25': 100,
    'Target Oct\'25': 120,
    'Target Nov\'25': 150
  },
  {
    'Field Engineer': 'jane.smith@bluetown.com',
    'Target Sep\'25': 80,
    'Target Oct\'25': 90,
    'Target Nov\'25': 110
  },
  {
    'Field Engineer': 'mike.wilson@bluetown.com',
    'Target Sep\'25': 150,
    'Target Oct\'25': 160,
    'Target Nov\'25': 180
  }
];

/**
 * Convert Excel data to the required JSON format for bulk import
 * @param {Array} excelData - Array of objects from Excel file
 * @returns {Object} - Formatted data for API
 */
function convertExcelToJson(excelData) {
  const targetsData = excelData.map(row => {
    return {
      email: row['Field Engineer'],
      september2025: row['Target Sep\'25'] || 0,
      october2025: row['Target Oct\'25'] || 0,
      november2025: row['Target Nov\'25'] || 0
    };
  });

  return {
    targetsData
  };
}

/**
 * Example usage with the API
 */
async function importTargetsToAPI(targetsData, apiUrl, token) {
  try {
    const response = await fetch(`${apiUrl}/api/user-targets/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetsData })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Import successful:', result);
      console.log(`Successfully imported ${result.results.length} targets`);
      if (result.errors.length > 0) {
        console.log('Errors:', result.errors);
      }
    } else {
      console.error('Import failed:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Convert the example data
const jsonData = convertExcelToJson(excelData);
console.log('Converted JSON data:');
console.log(JSON.stringify(jsonData, null, 2));

// Example of how to use with the API
// const apiUrl = 'http://localhost:4000'; // Your API URL
// const token = 'your-auth-token'; // Your authentication token
// importTargetsToAPI(jsonData.targetsData, apiUrl, token);

module.exports = {
  convertExcelToJson,
  importTargetsToAPI
};
