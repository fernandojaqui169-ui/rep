export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas GET é permitido
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extrair o CPF da URL (usando req.query fornecido pela Vercel)
  let cpf = req.query.cpf || '';
  if (Array.isArray(cpf)) cpf = cpf[0];

  // Limpar CPF (remover pontos, traços, etc)
  cpf = cpf.replace(/\D/g, '');

  console.log('[API CPF] CPF recebido:', cpf);

  // Validar CPF (apenas números, 11 dígitos)
  if (!cpf || cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
    console.log('[API CPF] CPF inválido:', cpf);
    return res.status(400).json({
      success: false,
      error: 'CPF inválido: deve conter 11 dígitos',
      received: cpf,
    });
  }

  // Token da API
  const API_TOKEN = process.env.API_TOKEN || '4d90545d3421dcb3c63a4361f931cbf18c3d0747951590c1df2d2e65b260986f';

  console.log('[API CPF] Consultando API externa para CPF:', cpf);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const apiResponse = await fetch(`https://api.bluenext2.online/api/v1/consult/${cpf}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await apiResponse.text();
    console.log('[API CPF] Status da API:', apiResponse.status);

    try {
      const jsonData = JSON.parse(data);
      console.log('[API CPF] Resposta recebida com sucesso');
      return res.status(apiResponse.status).json(jsonData);
    } catch (e) {
      console.error('[API CPF] Erro ao processar JSON:', data.substring(0, 200));
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar resposta da API externa',
        raw: data.substring(0, 200),
      });
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('[API CPF] Timeout na requisição');
      return res.status(504).json({ success: false, error: 'Timeout ao consultar API externa' });
    }
    console.error('[API CPF] Erro na requisição:', e.message);
    return res.status(500).json({
      success: false,
      error: 'Erro ao conectar com API externa',
      detail: e.message,
    });
  }
}
