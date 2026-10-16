
/*
 * N.E.X.U.S frontend
 * Cloudflare Workerの公開後、API_URLを書き換えてください。
 */
const API_URL = "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev";

const $ = id => document.getElementById(id);
const state = {
  messages: [],
  mode: "text",
  started: Date.now(),
  stream: null,
  recognition: null,
  returnTimer: null,
  speaking: false
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function updateClock() {
  const d = new Date();
  $("clock").textContent =
    `${d.toLocaleTimeString("ja-JP", {hour12:false})} | ` +
    `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ` +
    `(${weekdays[d.getDay()]})`;

  const sec = Math.floor((Date.now() - state.started) / 1000);
  $("uptime").textContent = [
    Math.floor(sec / 3600),
    Math.floor(sec / 60) % 60,
    sec % 60
  ].map(n => String(n).padStart(2, "0")).join(":");
}
updateClock();
setInterval(updateClock, 1000);

function updateCounts() {
  $("messageCount").textContent = state.messages.length;
  $("fileCount").textContent = $("fileList").children.length;
  $("modeStatus").textContent = state.mode.toUpperCase();
}

function addMessage(role, content, save = true) {
  if (save) state.messages.push({ role, content });

  const article = document.createElement("article");
  article.className = role;
  const name = document.createElement("b");
  name.textContent = role === "user" ? "YOU" : "N.E.X.U.S";
  const text = document.createElement("div");
  text.textContent = content;
  article.append(name, text);
  $("messages").append(article);
  $("messages").scrollTop = $("messages").scrollHeight;
  updateCounts();
  return text;
}

/* 字幕は一文字ずつではなく、句読点を目安に2行ずつ更新 */
function showCaptions(text) {
  const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
  const lines = [];
  for (let i = 0; i < sentences.length; i += 2) {
    lines.push(sentences.slice(i, i + 2).join("").trim());
  }

  let index = 0;
  $("captions").textContent = "";
  const next = () => {
    if (index >= lines.length) return;
    $("captions").textContent = lines.slice(0, index + 1).join("\n");
    index++;
    if (index < lines.length) setTimeout(next, 1400);
  };
  next();
}

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const select = $("voiceSelect");
  const previous = select.value;
  select.replaceChildren(new Option("端末の既定音声", ""));
  speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith("ja"))
    .forEach(v => select.add(new Option(v.name, v.name)));
  select.value = previous;
}
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
  if (!("speechSynthesis" in window) || !$("autoSpeak").checked) {
    if (state.mode === "voice") scheduleReturn();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = Number($("speechRate").value);

  const chosen = speechSynthesis.getVoices()
    .find(v => v.name === $("voiceSelect").value);
  if (chosen) utterance.voice = chosen;

  utterance.onstart = () => {
    state.speaking = true;
    $("center").classList.add("speaking");
    clearTimeout(state.returnTimer);
  };

  utterance.onend = () => {
    state.speaking = false;
    $("center").classList.remove("speaking");
    if (state.mode === "voice") scheduleReturn();
  };

  utterance.onerror = () => {
    state.speaking = false;
    $("center").classList.remove("speaking");
    if (state.mode === "voice") scheduleReturn();
  };

  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  state.speaking = false;
  $("center").classList.remove("speaking");
}

function scheduleReturn() {
  clearTimeout(state.returnTimer);
  state.returnTimer = setTimeout(() => {
    if (state.mode === "voice" && !state.speaking) {
      $("layout").classList.remove("voice-layout");
      $("center").classList.remove("visual-mode");
      $("chatPanel").classList.remove("hidden");
    }
  }, 10000);
}

/* 簡易グラフ：y = ax² + bx + c */
function drawQuadraticGraph(expression) {
  const match = expression.match(
    /y\s*=\s*(-?\d*\.?\d*)\s*x\s*(?:\^\s*2|²)\s*([+-]\s*\d*\.?\d*)?\s*x?\s*([+-]\s*\d+\.?\d*)?/i
  );

  let a = 1, b = 0, c = 0;
  if (match) {
    if (match[1] && match[1] !== "+") a = Number(match[1] === "-" ? -1 : match[1]);
    if (match[2]) b = Number(match[2].replace(/\s/g, "").replace(" ", ""));
    if (match[3]) c = Number(match[3].replace(/\s/g, ""));
  }

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const xmin = -5, xmax = 5, ymin = -10, ymax = 10;
  const X = x => (x - xmin) / (xmax - xmin) * W;
  const Y = y => H - (y - ymin) / (ymax - ymin) * H;

  ctx.fillStyle = "#0b1b25";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#19394a";
  ctx.lineWidth = 1;

  for (let x = xmin; x <= xmax; x++) {
    ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); ctx.stroke();
  }
  for (let y = ymin; y <= ymax; y += 2) {
    ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); ctx.stroke();
  }

  ctx.strokeStyle = "#8db3c1";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();

  ctx.strokeStyle = "#39dcff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= W; px++) {
    const x = xmin + px / W * (xmax - xmin);
    const y = a*x*x + b*x + c;
    if (y < ymin - 3 || y > ymax + 3) { started = false; continue; }
    if (!started) { ctx.moveTo(px, Y(y)); started = true; }
    else ctx.lineTo(px, Y(y));
  }
  ctx.stroke();

  const title = document.createElement("h3");
  title.textContent = `グラフ：y = ${a}x² + ${b}x + ${c}`;
  const note = document.createElement("p");
  note.textContent = "表示範囲：-5 ≤ x ≤ 5、-10 ≤ y ≤ 10。式を読み取れない場合は、正しい式か確認してください。";
  $("visualContent").replaceChildren(title, canvas, note);
  $("visualPanel").hidden = false;
}

/* 質問にグラフが必要そうなときの簡易表示判定 */
function maybeShowVisualization(question, answer) {
  const graphWords = /グラフ|放物線|二次関数|二次方程式|関数の図|関数 y\s*=/;
  const formula = answer.match(/y\s*=\s*[-\d.]+\s*x\s*(?:\^2|²)/i)
    || question.match(/y\s*=\s*[-\d.]+\s*x\s*(?:\^2|²)/i);

  if (formula && graphWords.test(question + " " + answer)) {
    drawQuadraticGraph(formula[0]);
    $("center").classList.add("visual-mode");
    if (state.mode === "voice") {
      $("layout").classList.add("voice-layout");
      $("chatPanel").classList.add("hidden");
    }
  } else if (graphWords.test(question)) {
    $("visualContent").replaceChildren();
    const p = document.createElement("p");
    p.textContent = "図解が役立ちそうです。具体的な関数の式を指定すると、対応する簡易グラフを表示できます。";
    $("visualContent").append(p);
    $("visualPanel").hidden = false;
    $("center").classList.add("visual-mode");
    if (state.mode === "voice") {
      $("layout").classList.add("voice-layout");
      $("chatPanel").classList.add("hidden");
    }
  }
}

async function sendMessage(question) {
  question = question.trim();
  if (!question) return;

  stopListening();
  clearTimeout(state.returnTimer);
  addMessage("user", question);
  $("chatInput").value = "";
  $("captions").textContent = "考え中…";
  $("voiceStatus").textContent = "AIが回答を生成中…";

  const loading = addMessage("assistant", "回答を生成しています…", false);
  $("commandCount").textContent =
    String(Number($("commandCount").textContent || 0) + 1);

  try {
    if (API_URL.includes("YOUR-WORKER")) {
      throw new Error("API_URLをCloudflare WorkerのURLに設定してください。");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.messages })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`AIサーバーエラー (${response.status}): ${details}`);
    }

    const data = await response.json();
    const answer = data.reply;

    if (typeof answer !== "string" || !answer.trim()) {
      throw new Error("AIから回答を受け取れませんでした。");
    }

    loading.textContent = answer;
    state.messages.push({ role: "assistant", content: answer });
    updateCounts();
    showCaptions(answer);
    maybeShowVisualization(question, answer);
    speak(answer);
    $("voiceStatus").textContent = "回答しました";
  } catch (error) {
    loading.textContent =
      "AIに接続できませんでした。\n" +
      error.message +
      "\nCloudflare WorkerのURL、AI binding、利用枠を確認してください。";
    $("captions").textContent = "AI接続を確認してください。";
    $("voiceStatus").textContent = "接続エラー";
    console.error(error);
  }
}

$("chatForm").addEventListener("submit", event => {
  event.preventDefault();
  sendMessage($("chatInput").value);
});

$("chatInput").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("chatForm").requestSubmit();
  }
});

function stopListening() {
  if (state.recognition) {
    try { state.recognition.stop(); } catch (_) {}
    state.recognition = null;
  }
}

$("voiceMode").onclick = () => {
  state.mode = "voice";
  updateCounts();
  $("layout").classList.add("voice-layout");
  $("chatPanel").classList.add("hidden");
  $("voiceStatus").textContent = "音声入力を開始しています…";
  clearTimeout(state.returnTimer);

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    $("captions").textContent =
      "このブラウザでは音声認識を利用できません。文字入力モードを使ってください。";
    $("voiceStatus").textContent = "音声認識に非対応";
    return;
  }

  const recognition = new Recognition();
  state.recognition = recognition;
  recognition.lang = "ja-JP";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    $("voiceStatus").textContent = "話しかけてください";
    $("captions").textContent = "聞き取り中…";
  };

  recognition.onresult = event => {
    let interim = "", finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      else interim += event.results[i][0].transcript;
    }
    $("captions").textContent = finalText || interim;
    if (finalText.trim()) sendMessage(finalText);
  };

  recognition.onerror = event => {
    $("voiceStatus").textContent = "音声エラー：" + event.error;
  };

  recognition.onend = () => {
    if (state.mode === "voice" && !state.speaking) scheduleReturn();
  };

  try { recognition.start(); }
  catch (error) { $("voiceStatus").textContent = "マイクを開始できませんでした"; }
};

$("textMode").onclick = () => {
  stopListening();
  stopSpeaking();
  state.mode = "text";
  updateCounts();
  clearTimeout(state.returnTimer);
  $("layout").classList.remove("voice-layout");
  $("chatPanel").classList.remove("hidden");
  $("voiceStatus").textContent = "テキスト会話モード";
};

$("stopSpeech").onclick = () => {
  stopListening();
  stopSpeaking();
  $("voiceStatus").textContent = "音声を停止しました";
};

$("settingsOpen").onclick = () => $("settingsDialog").showModal();

$("speechRate").oninput = event => {
  $("speedValue").textContent = Number(event.target.value).toFixed(1) + "x";
};
$("fontSize").oninput = event => {
  document.documentElement.style.setProperty("--scale", event.target.value / 100);
  $("fontValue").textContent = event.target.value + "%";
};
$("themeSelect").onchange = event => {
  document.body.classList.toggle("light", event.target.value === "light");
};

$("clearChat").onclick = () => {
  state.messages = [];
  $("messages").replaceChildren();
  updateCounts();
  $("captions").textContent = "履歴をクリアしました。";
};

$("saveHistory").onclick = () => {
  const blob = new Blob([JSON.stringify(state.messages, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nexus-history.json";
  a.click();
  URL.revokeObjectURL(url);
};

$("fileInput").onchange = event => {
  const list = $("fileList");
  list.replaceChildren();
  for (const file of event.target.files) {
    const item = document.createElement("div");
    item.textContent = `📎 ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
    list.append(item);
  }
  updateCounts();
  $("captions").textContent =
    "ファイルを選択しました。ファイル内容のAI解析は次の開発段階で追加します。";
};

$("cameraButton").onclick = async () => {
  const video = $("camera");
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
    video.srcObject = null;
    video.hidden = true;
    $("cameraButton").textContent = "カメラを開く";
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = state.stream;
    video.hidden = false;
    $("cameraButton").textContent = "カメラを閉じる";
  } catch (error) {
    $("captions").textContent =
      "カメラを利用できません。HTTPS接続とブラウザの権限を確認してください。";
  }
};

$("closeVisual").onclick = () => {
  $("visualPanel").hidden = true;
  $("center").classList.remove("visual-mode");
};

$("weatherRefresh").onclick = () => {
  $("weatherText").textContent =
    "天気APIは未設定です。現在の天気を取得するには別途接続が必要です。";
};

window.addEventListener("beforeunload", () => {
  stopListening();
  stopSpeaking();
  if (state.stream) state.stream.getTracks().forEach(track => track.stop());
});
