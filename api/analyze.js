const { google } = require('googleapis');
const axios = require('axios');

module.exports = async (req, res) => {
  // --- BLOQUE DE PERMISOS CORS ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://www.techebooks.online');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  // --- FIN DEL BLOQUE ---

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido. Usa POST.' });
  }

  const { accessToken, siteUrl, query } = req.body;

  if (!accessToken || !siteUrl || !query) {
    return res.status(400).json({ message: 'Faltan parámetros: accessToken, siteUrl o query.' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });

    // --- ¡NUEVO! CÁLCULO DE FECHAS ---
    // Calculamos el rango de fechas para los últimos 90 días.
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const startDateFormatted = startDate.toISOString().split('T')[0];

    // --- CONSULTA A GSC (CORREGIDA CON FECHAS) ---
    const gscResponse = await webmasters.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDateFormatted, // Fecha de inicio añadida
        endDate: endDate,             // Fecha de fin añadida
        dimensions: ['page'],
        dimensionFilterGroups: [{
          filters: [{
            dimension: 'query',
            operator: 'equals',
            expression: query
          }]
        }],
        rowLimit: 10
      }
    });

    const rows = gscResponse.data.rows || [];

    if (rows.length < 2) {
      return res.status(200).json({
        accion: "NO_HAY_CONFLICTO",
        justificacion: `Solo se encontró 1 URL (o ninguna) para la consulta "${query}" en los últimos 90 días. No hay canibalización que analizar.`
      });
    }

    const url1 = rows[0].keys[0];
    const url2 = rows[1].keys[0];

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const prompt = `
      Eres un experto SEO de clase mundial. Analiza una canibalización de palabra clave.
      La consulta de búsqueda es: "${query}"
      La URL 1 que posiciona es: ${url1}
      La URL 2 que también posiciona es: ${url2}
      Basándote en las URLs, determina si la intención de búsqueda es la misma o diferente y recomienda "FUSIONAR" o "DIFERENCIAR".
      Proporciona una justificación concisa.
      Responde únicamente en formato JSON: {"accion": "TU_ACCION", "justificacion": "TU_EXPLICACION"}
    `;

    const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions',
      { model: 'mistralai/mistral-7b-instruct', messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Authorization': `Bearer ${openRouterApiKey}` } }
    );
    
    const aiResultJson = JSON.parse(aiResponse.data.choices[0].message.content);
    
    res.status(200).json({
        ...aiResultJson,
        urlConflicto1: url1,
        urlConflicto2: url2,
        queryAnalizada: query
    });

  } catch (error) {
    console.error('Error detallado en analyze.js:', error);
    res.status(500).json({ message: 'Ha ocurrido un error en el servidor durante el análisis.' });
  }
};