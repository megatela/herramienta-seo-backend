const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

module.exports = async (req, res) => {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;

    // ¡¡¡CAMBIA ESTA URL POR LA DE TU ENTRADA DE BLOG!!!
    const blogPostUrl = 'https://www.techebooks.online/2025/08/herramienta-canibalizacion-seo.html';
    
    const redirectUrl = `${blogPostUrl}#access_token=${accessToken}`;
    
    res.writeHead(302, { Location: redirectUrl });
    res.end();

  } catch (error) {
    console.error('Error al intercambiar token:', error);
    res.status(500).send('Fallo en la autenticación');
  }
};