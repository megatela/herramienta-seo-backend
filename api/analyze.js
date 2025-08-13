// Este código se ejecutará en un servidor, no en el navegador.

// Importamos una herramienta llamada 'axios' que nos ayudará a hacer llamadas a otras APIs.
const axios = require('axios');

// Esta es la función principal. Se activará cada vez que nuestro frontend la llame.
module.exports = async (req, res) => {
  // Por seguridad, nos aseguramos de que la solicitud sea del tipo correcto (POST).
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido. Usa POST.' });
  }

  try {
    // --- PASO A: Recibimos los datos del frontend ---
    // Nuestro frontend nos enviará los datos de las URLs en conflicto.
    const { url1, title1, description1, url2, title2, description2 } = req.body;

    // --- PASO B: Preparamos la instrucción para la IA ---
    // Aquí le decimos a la IA quién es y qué tiene que hacer.
    // ¡Este "prompt" es la clave de la magia!
    const prompt = `
      Eres un experto SEO de clase mundial, especializado en resolver canibalización de palabras clave.
      Analiza la siguiente información de dos URLs que compiten y da una recomendación clara y accionable.

      URL 1: ${url1}
      Título 1: "${title1}"
      Descripción 1: "${description1}"

      URL 2: ${url2}
      Título 2: "${title2}"
      Descripción 2: "${description2}"

      Basándote en esto, determina si la mejor acción es "FUSIONAR" (combinar el contenido) o "DIFERENCIAR" (optimizar cada una para una intención distinta).
      Proporciona una justificación concisa.

      Responde ÚNICAMENTE en formato JSON, así:
      {
        "accion": "TU_RESPUESTA",
        "justificacion": "TU_EXPLICACION"
      }
    `;

    // --- PASO C: Llamamos a la API de OpenRouter ---
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct', // Usamos un modelo bueno, rápido y barato.
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          // Aquí usaremos la API Key de forma segura.
          // Le decimos al código que la busque en las variables de entorno de Vercel.
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
      }
    );

    // --- PASO D: Enviamos la respuesta de la IA de vuelta al frontend ---
    const aiResultText = response.data.choices[0].message.content;
    const aiResultJson = JSON.parse(aiResultText);

    // Enviamos una respuesta exitosa (código 200) con el análisis de la IA.
    res.status(200).json(aiResultJson);

  } catch (error) {
    // Si algo sale mal, lo registramos y enviamos un error.
    console.error('Error en el backend:', error);
    res.status(500).json({ message: 'Error en el servidor.' });
  }
};