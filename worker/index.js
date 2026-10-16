
export default {
  async fetch(request, env) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "POSTリクエストを使用してください。" },
        { status: 405, headers }
      );
    }

    try {
      const body = await request.json();

      if (!Array.isArray(body.messages)) {
        return Response.json(
          { error: "messages配列が必要です。" },
          { status: 400, headers }
        );
      }

      // 入力サイズと履歴の長さを制限
      const messages = body.messages
        .slice(-12)
        .filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        )
        .map(m => ({
          role: m.role,
          content: m.content.slice(0, 4000)
        }));

      if (!messages.length) {
        return Response.json(
          { error: "質問を入力してください。" },
          { status: 400, headers }
        );
      }

      const systemPrompt = {
        role: "system",
        content: [
          "あなたはN.E.X.U.Sという高校生向けAI家庭教師です。",
          "日本語で、正確かつ分かりやすく説明してください。",
          "数学では計算過程を順番に示してください。",
          "高校生に合った言葉で説明し、必要なら例を使ってください。",
          "分からないことは推測で断定せず、分からないと伝えてください。",
          "問題の条件が足りない場合は、確認してください。",
          "危険な内容ではなく、安全な学習を助けてください。"
        ].join("")
      };

      // Cloudflare Workers AI bindingを使用
      const result = await env.AI.run(
        "@cf/google/gemma-4-26b-a4b-it",
        {
          messages: [systemPrompt, ...messages],
          chat_template_kwargs: {
            enable_thinking: false
          }
        }
      );

      const reply = result?.response;

      if (typeof reply !== "string" || !reply.trim()) {
        throw new Error("AIの回答が空でした。");
      }

      return Response.json({ reply }, { headers });

    } catch (error) {
      console.error("NEXUS AI error:", error);

      return Response.json(
        {
          error: "AIの処理に失敗しました。",
          detail: "AI binding、モデルの利用可否、利用上限を確認してください。"
        },
        { status: 502, headers }
      );
    }
  }
};
