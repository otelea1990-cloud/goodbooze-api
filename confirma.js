const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', mesaj: 'Metoda nepermisa' });
  }

  const { nume, telefon, insotit, numeInsotit, cod } = req.body;

  if (!nume || !telefon || !cod) {
    return res.status(400).json({ status: 'error', mesaj: 'Campuri lipsa' });
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = '19_5VYM0Mn7XeMJbpmJNKYa4cf255ltFmrVdFVbTp4N0';

    const codResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Coduri!A:D',
    });

    const rows = codResponse.data.values || [];
    const codTrimis = cod.toUpperCase().trim();
    let codGasit = false;
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] && rows[i][1].toUpperCase().trim() === codTrimis) {
        codGasit = true;
        rowIndex = i + 1;
        if (rows[i][3] && rows[i][3].toLowerCase() === 'folosit') {
          return res.status(200).json({ status: 'used', mesaj: 'Acest cod a fost deja folosit.' });
        }
        break;
      }
    }

    if (!codGasit) {
      return res.status(200).json({ status: 'invalid', mesaj: 'Cod de invitatie invalid.' });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Coduri!D${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Folosit']] },
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Invitati petrecere!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[new Date().toISOString(), nume, telefon, insotit, numeInsotit || '', codTrimis]],
      },
    });

    return res.status(200).json({ status: 'success', mesaj: 'Confirmare inregistrata.' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', mesaj: 'Eroare server.' });
  }
}
