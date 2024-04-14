addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  return response;
}
addEventListener('fetch', event => {
  if (event.request.method === "OPTIONS") {
    // 处理CORS预检请求
    event.respondWith(handleCORS(new Response(null, { status: 204 })));
  } else {
    event.respondWith(handleRequest(event.request));
  }
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // 根据路径分配处理逻辑
  switch (url.pathname) {
    case '/add':
      return handleAdd(request);
    case '/guess':
      return handleGuess(request);
    default:
      return handleCORS(new Response('未找到页面', { status: 404 }));
  }
}

async function handleGuess(request) {
  if (request.method !== 'POST') {
    return handleCORS(new Response(JSON.stringify({"message": "method not allowed"}), { status: 405 }));
  }

  try {
    const requestData = await request.json();
    const abbreviation = requestData.text;

    if (!abbreviation) {
      return handleCORS(new Response(JSON.stringify({"message": "未包含请求key"}), { status: 400 }));
    }

    const data = await sysydb.get(abbreviation.toLowerCase());
    if (!data) {
      return handleCORS(new Response(JSON.stringify({"message": "未找到"}), { status: 404 }));
    }

    const translations = JSON.parse(data);
    const result = [{ name: abbreviation, trans: translations }];
    
    return handleCORS(new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    }));
  } catch (error) {
    return handleCORS(new Response(JSON.stringify({"message": "服务器错误"}), { status: 500 }));
  }
}

async function handleAdd(request) {
  if (request.method !== 'POST') {
    return handleCORS(new Response(JSON.stringify({"message": "需要 POST 请求"}), { status: 405, headers: { 'Content-Type': 'application/json' } }));
  }

  // 检查 API 密钥
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey || apiKey !== API_KEY) {
    return handleCORS(new Response(JSON.stringify({"message": "无效的 API 密钥"}), { status: 401, headers: { 'Content-Type': 'application/json' } }));
  }

  try {
    const requestData = await request.json();
    const key = requestData.key;
    const newValue = requestData.value;

    if (!key || typeof key !== 'string' || key.length > 50) {
      return handleCORS(new Response(JSON.stringify({"message": "键无效或太长"}), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const existingData = await sysydb.get(key.toLowerCase());
    if (existingData) {
      // 解析已存在的数据
      const existingValue = JSON.parse(existingData);
      
      // 合并新旧数据，确保新数据项不与旧数据重合
      const combinedValue = Array.from(new Set([...existingValue, ...newValue]));

      // 存储合并后的数据
      await sysydb.put(key.toLowerCase(), JSON.stringify(combinedValue));
      return handleCORS(new Response(JSON.stringify({"message": "数据已成功更新"}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    } else {
      // 如果没有现有数据，直接添加新数据
      await sysydb.put(key.toLowerCase(), JSON.stringify(newValue));
      return handleCORS(new Response(JSON.stringify({"message": "数据已成功存储"}), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
  } catch (error) {
    return new Response(JSON.stringify({"message": "服务器错误"}), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
