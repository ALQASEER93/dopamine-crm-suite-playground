const ExcelJS = require('exceljs');

const normalizeCellValue = value => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    if (value.text) {
      return value.text;
    }
    if (value.result !== undefined) {
      return value.result;
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map(item => item.text).join('');
    }
  }

  return value;
};

const worksheetToJson = worksheet => {
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const value = normalizeCellValue(cell.value);
    const label = value !== null ? String(value).trim() : '';
    headers[colNumber] = label;
  });

  const rows = [];
  const maxRow = worksheet.rowCount;
  for (let rowNumber = 2; rowNumber <= maxRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const rowData = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      const cellValue = normalizeCellValue(row.getCell(index).value);
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        hasValue = true;
      }
      rowData[header] = cellValue === undefined ? null : cellValue;
    });

    if (hasValue) {
      rows.push(rowData);
    }
  }

  return rows;
};

const loadWorkbookRows = async (filePath, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
  return worksheetToJson(worksheet);
};

const loadWorkbookRowsWithFallback = async (filePath, preferredSheets) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  let worksheet = null;
  if (Array.isArray(preferredSheets)) {
    for (const sheetName of preferredSheets) {
      worksheet = workbook.getWorksheet(sheetName);
      if (worksheet) {
        break;
      }
    }
  }

  if (!worksheet) {
    worksheet = workbook.worksheets[0];
  }

  if (!worksheet) {
    return [];
  }

  return worksheetToJson(worksheet);
};

module.exports = {
  loadWorkbookRows,
  loadWorkbookRowsWithFallback,
};
