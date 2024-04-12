addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);

  switch (url.pathname) {
    case '/add':
      return handleAdd(request);
    case '/guess':
      return handleGuess(request);
    default:
      return new Response('未找到页面', { status: 404 });
  }
}

async function handleGuess(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({"message": "method not allowed"}), { status: 405 });
  }

  try {
    const requestData = await request.json();
    const abbreviation = requestData.text;

    if (!abbreviation) {
      return new Response(JSON.stringify({"message": "未包含请求key"}), { status: 400 });
    }

    const data = await sysydb.get(abbreviation.toLowerCase());
    if (!data) {
      return new Response(JSON.stringify({"message": "未找到"}), { status: 404 });
    }

    const translations = JSON.parse(data);
    const result = [{ name: abbreviation, trans: translations }];
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({"message": "服务器错误"}), { status: 500 });
  }
}
async function handleAdd(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({"message": "需要 POST 请求"}), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== API_KEY) {
    return new Response(JSON.stringify({"message": "无效的 API 密钥"}), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const requestData = await request.json();
    const key = requestData.key;
    const newValue = requestData.value;

    if (!key || typeof key !== 'string' || key.length > 50) {
      return new Response(JSON.stringify({"message": "键无效或太长"}), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingData = await sysydb.get(key.toLowerCase());
    if (existingData) {
      const existingValue = JSON.parse(existingData);
      
      const combinedValue = Array.from(new Set([...existingValue, ...newValue]));

      await sysydb.put(key.toLowerCase(), JSON.stringify(combinedValue));
      return new Response(JSON.stringify({"message": "数据已成功更新"}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      await sysydb.put(key.toLowerCase(), JSON.stringify(newValue));
      return new Response(JSON.stringify({"message": "数据已成功存储"}), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({"message": "服务器错误"}), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
