/**
 * AllergyLocate — Team Backend (Google Apps Script)
 *
 * This turns a Google Sheet into a free API your team tool talks to.
 * No server, no hosting cost — Google runs this for you.
 *
 * SETUP:
 * 1. Create a new Google Sheet.
 * 2. Rename the first tab "Restaurants". Add a second tab named "Team".
 * 3. In the Sheet, go to Extensions -> Apps Script.
 * 4. Delete whatever's in the editor, paste this entire file in.
 * 5. Click Deploy -> New deployment -> type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone (this is what lets the team tool submit to it)
 * 6. Click Deploy. Copy the Web App URL it gives you — the team-tool.html
 *    file needs that URL pasted into it (see the TEAM_TOOL_URL comment there).
 * 7. First time you run it, Google will ask you to authorize permissions —
 *    that's normal, it's just Apps Script needing permission to edit your own Sheet.
 */

const RESTAURANT_HEADERS = [
  'ID', 'Restaurant Name', 'Source URL', 'Type', 'NYC', 'Status', 'Submitted By',
  'Transparency Score',
  'Completeness Score', 'Completeness Reason',
  'Accessibility Score', 'Accessibility Reason',
  'Currency Score', 'Currency Reason',
  'Format Score', 'Format Reason',
  'Disclosure Score', 'Disclosure Reason',
  'Evidence Quotes', 'Submitted Date', 'Verified By', 'Verified Date'
];

const TEAM_HEADERS = ['Name', 'Email', 'Points', 'Submitted', 'Approved', 'Rejected'];

// ---- Scoring engine (same logic as transparency-score.js, ported to Apps Script) ----
const MAJOR_ALLERGENS = ['milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'wheat', 'soybeans', 'sesame'];
const WEIGHTS = { completeness: 30, accessibility: 25, currency: 15, format_navigation: 15, disclosure: 15 };

function scoreCompleteness(record) {
  const allergens = record.allergens_covered || [];
  const ratio = allergens.length / MAJOR_ALLERGENS.length;
  const multiplier = { item_level: 1.0, category_level: 0.75, blanket_statement: 0.3 }[record.specificity_level] || 0.3;
  const score = Math.round(WEIGHTS.completeness * ratio * multiplier);
  return { score, reason: `${allergens.length}/9 allergens at "${record.specificity_level}" detail` };
}

function scoreAccessibility(record) {
  let score = WEIGHTS.accessibility;
  const clicks = record.clicks_from_homepage || 1;
  score -= Math.min(13, Math.max(0, (clicks - 1) * 4));
  if (!record.labeled_clearly) score -= 8;
  if (record.url_type === 'linktree_style') score -= 4;
  score = Math.max(0, score);
  return { score, reason: `${clicks} click(s), ${record.labeled_clearly ? 'clearly labeled' : 'not clearly labeled'}` };
}

function scoreCurrency(record) {
  if (!record.last_updated_date) return { score: 0, reason: 'No update date found' };
  const months = Math.round((new Date() - new Date(record.last_updated_date)) / (1000 * 60 * 60 * 24 * 30.44));
  let score;
  if (months <= 6) score = WEIGHTS.currency;
  else if (months <= 12) score = 11;
  else if (months <= 24) score = 6;
  else score = 1;
  return { score, reason: `Last updated ~${months} months ago` };
}

function scoreFormat(record) {
  const formatScores = { searchable_tool: 15, organized_pdf: 10, unorganized_pdf: 4, plain_text: 6 };
  let score = formatScores[record.format] || 4;
  if (record.format === 'unorganized_pdf' && record.page_count > 15) score = Math.max(0, score - 2);
  return { score, reason: `Format: ${record.format}${record.page_count ? ` (${record.page_count} pages)` : ''}` };
}

function scoreDisclosure(record) {
  let score = 0;
  if (record.mentions_cross_contact) score += 9;
  if (record.mentions_shared_equipment) score += 6;
  return { score, reason: record.mentions_cross_contact ? 'Cross-contact addressed' : 'No cross-contact language found' };
}

function computeTransparencyScore(record) {
  const completeness = scoreCompleteness(record);
  const accessibility = scoreAccessibility(record);
  const currency = scoreCurrency(record);
  const format = scoreFormat(record);
  const disclosure = scoreDisclosure(record);
  const total = completeness.score + accessibility.score + currency.score + format.score + disclosure.score;
  return { total, completeness, accessibility, currency, format, disclosure };
}

// ---- Sheet helpers ----
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function trimName(name) {
  return (name || '').toString().trim();
}

function normalizeName(name) {
  return trimName(name).toLowerCase();
}

function findTeamRow(sheet, name) {
  const data = sheet.getDataRange().getValues();
  const target = normalizeName(name);
  for (let i = 1; i < data.length; i++) {
    if (normalizeName(data[i][0]) === target) return i + 1; // +1 because sheet rows are 1-indexed
  }
  return null;
}

// ---- Main entry points ----
function doPost(e) {
  const record = JSON.parse(e.postData.contents);
  const restaurantSheet = getOrCreateSheet('Restaurants', RESTAURANT_HEADERS);
  const teamSheet = getOrCreateSheet('Team', TEAM_HEADERS);

  const scored = computeTransparencyScore(record);
  const id = restaurantSheet.getLastRow(); // simple incrementing ID

  restaurantSheet.appendRow([
    id,
    record.restaurant_name,
    record.source_url,
    record.restaurant_type || 'chain',
    record.is_nyc ? 'Yes' : 'No',
    'Needs Review',
    record.submitted_by,
    scored.total,
    scored.completeness.score, scored.completeness.reason,
    scored.accessibility.score, scored.accessibility.reason,
    scored.currency.score, scored.currency.reason,
    scored.format.score, scored.format.reason,
    scored.disclosure.score, scored.disclosure.reason,
    record.evidence_quotes || '',
    new Date().toISOString(),
    '', ''
  ]);

  // Update team points (+1 for submitting; approval bonus happens separately, when you review it)
  let teamRow = findTeamRow(teamSheet, record.submitted_by);
  if (!teamRow) {
    teamSheet.appendRow([trimName(record.submitted_by), record.submitted_by_email || '', 1, 1, 0, 0]);
  } else {
    const points = teamSheet.getRange(teamRow, 3).getValue();
    const submitted = teamSheet.getRange(teamRow, 4).getValue();
    teamSheet.getRange(teamRow, 3).setValue(points + 1);
    teamSheet.getRange(teamRow, 4).setValue(submitted + 1);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    score: scored.total,
    breakdown: scored
  })).setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AllergyLocate')
    .addItem('Approve Selected Row', 'approveSelectedRow')
    .addToUi();
}

function approveSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  if (row === 1) {
    SpreadsheetApp.getUi().alert('Select a data row first, not the header row.');
    return;
  }
  const statusCol = RESTAURANT_HEADERS.indexOf('Status') + 1;
  const verifiedByCol = RESTAURANT_HEADERS.indexOf('Verified By') + 1;
  const verifiedDateCol = RESTAURANT_HEADERS.indexOf('Verified Date') + 1;

  sheet.getRange(row, statusCol).setValue('Approved');
  sheet.getRange(row, verifiedByCol).setValue(Session.getActiveUser().getEmail());
  sheet.getRange(row, verifiedDateCol).setValue(new Date().toISOString().split('T')[0]);

  const submittedByCol = RESTAURANT_HEADERS.indexOf('Submitted By') + 1;
  const submittedBy = sheet.getRange(row, submittedByCol).getValue();
  const teamSheet = getOrCreateSheet('Team', TEAM_HEADERS);
  const teamRow = findTeamRow(teamSheet, submittedBy);
  if (teamRow) {
    const points = teamSheet.getRange(teamRow, 3).getValue();
    const approvedCount = teamSheet.getRange(teamRow, 5).getValue();
    teamSheet.getRange(teamRow, 3).setValue(points + 2);
    teamSheet.getRange(teamRow, 5).setValue(approvedCount + 1);
  } else {
    // No exact name match in Team tab yet — create one rather than silently losing the points
    teamSheet.appendRow([trimName(submittedBy), '', 2, 0, 1, 0]);
  }

  SpreadsheetApp.getUi().alert(
    'Approved row ' + row + ' - "' + submittedBy + '" credited +2 bonus points' +
    (teamRow ? '.' : ' (new Team row created for this exact name — check for a near-duplicate, e.g. "Zamin" vs "Zamin Rizvi").')
  );
}

// Named column lookup — avoids hardcoded row[n] indices going stale when the schema changes
function col(headers, name) {
  return headers.indexOf(name);
}

function doGet(e) {
  const action = e.parameter.action;
  const H = RESTAURANT_HEADERS;

  if (action === 'search') {
    const query = (e.parameter.q || '').toLowerCase();
    const sheet = getOrCreateSheet('Restaurants', RESTAURANT_HEADERS);
    const data = sheet.getDataRange().getValues();
    const nameCol = col(H, 'Restaurant Name');
    const rows = data.slice(1).filter((row) => row[nameCol] && row[nameCol].toLowerCase().includes(query));
    return ContentService.createTextOutput(JSON.stringify({
      results: rows.map((row) => ({
        name: row[nameCol],
        status: row[col(H, 'Status')],
        score: row[col(H, 'Transparency Score')]
      }))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'leaderboard') {
    const sheet = getOrCreateSheet('Team', TEAM_HEADERS);
    const data = sheet.getDataRange().getValues();
    const team = data.slice(1).map((row) => ({ name: row[0], points: row[2], submitted: row[3] }));
    team.sort((a, b) => b.points - a.points);
    return ContentService.createTextOutput(JSON.stringify({ team }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Used by team-tool.html to power the restaurant-name autocomplete —
  // returns every name already in the Sheet, regardless of status, so
  // duplicates get caught before submission instead of after.
  if (action === 'allNames') {
    const sheet = getOrCreateSheet('Restaurants', RESTAURANT_HEADERS);
    const data = sheet.getDataRange().getValues();
    const nameCol = col(H, 'Restaurant Name');
    const names = data.slice(1).map((row) => row[nameCol]).filter(Boolean);
    return ContentService.createTextOutput(JSON.stringify({ names }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Used by the live site (index.html) to load real, approved restaurant data
  // instead of the old hardcoded RESTAURANTS array.
// Formats a Sheets date value (or ISO string) into "Month Year" style,
// matching the convention used elsewhere on the site (e.g. "July 2026").
function formatCheckedDate(value) {
  if (!value) return '';
  var d = (value instanceof Date) ? value : new Date(value);
  if (isNaN(d.getTime())) return value.toString();
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMMM yyyy');
}

// Pulls the raw format keyword out of a "Format: organized_pdf (16 pages)" style
// reason string and maps it to a short, human-readable label.
function extractFormatLabel(reason) {
  if (!reason) return '';
  var match = reason.match(/Format:\s*(\w+)/);
  if (!match) return '';
  var labels = {
    searchable_tool: 'Interactive Tool',
    organized_pdf: 'PDF',
    unorganized_pdf: 'PDF',
    plain_text: 'Text'
  };
  return labels[match[1]] || match[1];
}

  if (action === 'live') {
    const sheet = getOrCreateSheet('Restaurants', RESTAURANT_HEADERS);
    const data = sheet.getDataRange().getValues();
    const approvedRows = data.slice(1).filter((row) => row[col(H, 'Status')] === 'Approved');

    const restaurants = approvedRows.map((row) => ({
      name: row[col(H, 'Restaurant Name')],
      url: row[col(H, 'Source URL')],
      type: row[col(H, 'Type')] || 'chain',
      nyc: row[col(H, 'NYC')] === 'Yes',
      checked: formatCheckedDate(row[col(H, 'Verified Date')] || row[col(H, 'Submitted Date')]),
      format: extractFormatLabel(row[col(H, 'Format Reason')]),
      score: row[col(H, 'Transparency Score')]
    }));

    return ContentService.createTextOutput(JSON.stringify({ restaurants }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
