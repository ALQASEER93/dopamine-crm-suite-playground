const path = require('path');
const { Pharmacy } = require('../models');
const { loadWorkbookRows } = require('./excel');

const normalizeString = value => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return String(value).trim();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
};

const pickColumn = (row, keys) => {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }
  return null;
};

const normalizePharmacyRows = rows => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(row => ({
      name: normalizeString(pickColumn(row, ['name', 'Name', 'pharmacy', 'Pharmacy'])),
      city: normalizeString(pickColumn(row, ['city', 'City'])),
      area: normalizeString(pickColumn(row, ['area', 'Area'])),
      phone: normalizeString(pickColumn(row, ['phone', 'Phone'])),
    }))
    .filter(row => row.name);
};

const buildLookup = row => ({
  name: row.name,
  city: row.city || null,
  area: row.area || null,
});

const importPharmacies = async rows => {
  const normalized = normalizePharmacyRows(rows);
  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    total: Array.isArray(rows) ? rows.length : normalized.length,
  };

  for (const row of normalized) {
    if (!row.name) {
      summary.skipped += 1;
      continue;
    }

    const lookup = buildLookup(row);
    const existing = await Pharmacy.findOne({ where: lookup });

    if (existing) {
      await existing.update(row);
      summary.updated += 1;
    } else {
      await Pharmacy.create(row);
      summary.created += 1;
    }
  }

  return summary;
};

const loadPharmaciesFromWorkbook = async (filePath, sheetName) => {
  return loadWorkbookRows(filePath, sheetName);
};

const importPharmaciesFromFile = async (filePath, { sheetName } = {}) => {
  const absolutePath = path.resolve(filePath);
  const rows = await loadPharmaciesFromWorkbook(absolutePath, sheetName);
  return importPharmacies(rows);
};

module.exports = {
  normalizePharmacyRows,
  importPharmacies,
  importPharmaciesFromFile,
  loadPharmaciesFromWorkbook,
};
