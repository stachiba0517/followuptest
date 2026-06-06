const SERVICE_INTERESTS = [
  "今はまだ結構です、自分で進めてみます",
  "個別相談を希望",
  "3回コース勉強会に興味がある",
  "1日集中コースに興味がある",
  "3か月〜半年伴走に興味がある",
  "その他",
];

const MAX_INPUT_LENGTH = 500;

const state = {
  responses: [],
  activeView: "form",
  adminUnlocked: false,
  loadingResponses: false,
  filters: {
    keyword: "",
    segment: "",
    interest: "",
  },
};

let supabaseClient = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Supabase クライアントを初期化する。
 * @returns {boolean} 初期化に成功した場合 true
 */
function initSupabase() {
  const config = window.SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey || config.url.includes("YOUR_PROJECT_REF")) {
    showSetupError("Supabase の設定が読み込めません。supabase-config.js を確認するか、HTTP サーバー経由で index.html を開いてください。");
    return false;
  }
  if (!window.supabase?.createClient) {
    showSetupError("Supabase ライブラリの読み込みに失敗しました。インターネット接続を確認してください。");
    return false;
  }
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return true;
}

/**
 * Supabase クライアントが利用可能か確認する。
 * @returns {boolean}
 */
function ensureSupabase() {
  if (supabaseClient) return true;
  alert("Supabase に接続できていません。ページを再読み込みして設定を確認してください。");
  return false;
}

async function init() {
  setupNavigation();
  renderServiceChoices();
  setupConditionalFields();
  setupInputLimits();
  setupSurveyForm();
  setupAdminLogin();

  if (!initSupabase()) return;

  try {
    await initAuth();
  } catch (error) {
    console.error(error);
    showSetupError("Supabase への接続に失敗しました。ブラウザを再読み込みしてください。");
  }
}

/**
 * 画面上部にセットアップエラーを表示する。
 * @param {string} message 表示メッセージ
 */
function showSetupError(message) {
  const banner = $("#setupError");
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

/**
 * ログイン状態を復元し、認証変更を監視する。
 */
async function initAuth() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (session) {
    await unlockAdmin();
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await unlockAdmin();
    } else {
      lockAdmin();
    }
  });
}

function lockAdmin() {
  state.adminUnlocked = false;
  state.responses = [];
  state.loadingResponses = false;
  state.filters = {
    keyword: "",
    segment: "",
    interest: "",
  };
  $("#adminLock").hidden = false;
  $("#adminApp").hidden = true;
  $("#adminContent").innerHTML = "";
  $("#loginForm")?.reset();
}

async function unlockAdmin() {
  state.adminUnlocked = true;
  $("#adminLock").hidden = true;
  $("#adminApp").hidden = false;
  await loadResponses();
  if (state.activeView === "admin") renderAdmin();
}

/**
 * Supabase から回答一覧を取得する。
 */
async function loadResponses() {
  if (!state.adminUnlocked) return;

  state.loadingResponses = true;
  if (state.activeView === "admin") renderAdmin();

  const { data, error } = await supabaseClient
    .from("survey_responses")
    .select("*")
    .order("created_at", { ascending: false });

  if (!state.adminUnlocked) return;

  state.loadingResponses = false;

  if (error) {
    alert(`回答の取得に失敗しました: ${error.message}`);
    return;
  }

  state.responses = (data || []).map(normalizeResponse);
  if (state.activeView === "admin" && state.adminUnlocked) renderAdmin();
}

function switchView(viewName) {
  state.activeView = viewName;
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.id === `${viewName}View`));
  $$(".nav-button").forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewName));
  if (viewName === "admin" && state.adminUnlocked) renderAdmin();
}

function setupNavigation() {
  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
}

function renderServiceChoices() {
  $("#serviceChoices").innerHTML = SERVICE_INTERESTS.map(
    (item) => `
      <label>
        <input type="checkbox" name="service_interest" value="${escapeHtml(item)}" />
        <span>${escapeHtml(item)}</span>
      </label>
    `,
  ).join("");
}

function setupConditionalFields() {
  const updateIndustryOther = () => {
    const isOther = $("#industry").value === "その他";
    $("#industryOtherField").hidden = !isOther;
    $("input[name='industry_other']").required = isOther;
  };

  const updateServiceOther = (changedInput = null) => {
    const noOffer = $("input[name='service_interest'][value='今はまだ結構です、自分で進めてみます']");
    const serviceInputs = $$("input[name='service_interest']");

    if (changedInput?.value === noOffer.value && changedInput.checked) {
      serviceInputs.forEach((input) => {
        if (input !== noOffer) input.checked = false;
      });
    } else if (changedInput?.checked) {
      noOffer.checked = false;
    }

    const hasOther = serviceInputs.some((input) => input.checked && input.value === "その他");
    $("#serviceOtherField").hidden = !hasOther;
    $("input[name='service_interest_other']").required = hasOther;
  };

  $("#industry").addEventListener("change", updateIndustryOther);
  $("#serviceChoices").addEventListener("change", (event) => updateServiceOther(event.target));
  $("#surveyForm").addEventListener("reset", () => {
    requestAnimationFrame(() => {
      updateIndustryOther();
      updateServiceOther();
    });
  });
}

/**
 * 回答フォームのテキスト入力に文字数上限を設定する。
 */
function setupInputLimits() {
  $("#surveyForm")
    .querySelectorAll("input[type='text'], input[type='email'], textarea")
    .forEach((field) => {
      field.maxLength = MAX_INPUT_LENGTH;
    });
}

function setupSurveyForm() {
  $("#surveyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureSupabase()) return;

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const serviceInterest = formData.getAll("service_interest");

    if (!serviceInterest.length) {
      alert("サポートへの興味を1つ以上選んでください。");
      return;
    }

    const payload = {
      name: text(formData, "name"),
      company: text(formData, "company"),
      email: text(formData, "email"),
      industry: text(formData, "industry"),
      industry_other: text(formData, "industry_other"),
      impression: text(formData, "impression"),
      ai_use_scene: text(formData, "ai_use_scene"),
      tedious_task: text(formData, "tedious_task"),
      task_frequency: text(formData, "task_frequency"),
      ai_concern: text(formData, "ai_concern"),
      next_trial: text(formData, "next_trial"),
      service_interest: serviceInterest,
      service_interest_other: text(formData, "service_interest_other"),
      support_message: text(formData, "support_message"),
      testimonial_permission: text(formData, "testimonial_permission"),
      privacy_consent: formData.get("privacy_consent") === "同意する",
    };

    submitButton.disabled = true;
    submitButton.textContent = "送信中...";

    try {
      const { error } = await supabaseClient.from("survey_responses").insert(payload);

      if (error) {
        alert(`送信に失敗しました: ${error.message}`);
        return;
      }

      form.reset();
      $("#industryOtherField").hidden = true;
      $("#serviceOtherField").hidden = true;
      switchView("complete");
    } catch (error) {
      alert(`送信に失敗しました: ${error.message || "通信エラー"}`);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "回答を送信する";
    }
  });
}

function normalizeResponse(response) {
  const serviceInterest = Array.isArray(response.service_interest)
    ? response.service_interest
    : splitList(response.service_interest);
  return {
    ...response,
    service_interest: serviceInterest,
    testimonial_permission: response.testimonial_permission || "未確認",
    privacy_consent: Boolean(response.privacy_consent),
    consultation_candidate: serviceInterest.includes("個別相談を希望"),
    proposal_candidate: serviceInterest.some((item) =>
      ["3回コース勉強会に興味がある", "1日集中コースに興味がある", "3か月〜半年伴走に興味がある"].includes(item),
    ),
  };
}

function setupAdminLogin() {
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureSupabase()) return;

    const submitButton = $("#loginForm button[type='submit']");
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    submitButton.disabled = true;
    submitButton.textContent = "ログイン中...";

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        alert("メールアドレスまたはパスワードが違います。");
      }
    } catch (error) {
      alert(`ログインに失敗しました: ${error.message || "通信エラー"}`);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "ログイン";
    }
  });

  $("#exportCsv").addEventListener("click", exportCsv);
  $("#reloadResponses").addEventListener("click", () => loadResponses());
  $("#logoutButton").addEventListener("click", async () => {
    lockAdmin();
    await supabaseClient.auth.signOut();
  });
}

function renderAdmin() {
  if (!state.adminUnlocked) return;

  $("#adminContent").innerHTML = `
    ${summaryHtml()}
    ${filtersHtml()}
    <div id="responseResults">${responsesHtml(filteredResponses())}</div>
  `;
  bindFilterActions();
}

function summaryHtml() {
  const consultation = state.responses.filter((response) => response.consultation_candidate).length;
  const proposal = state.responses.filter((response) => response.proposal_candidate).length;
  const consent = state.responses.filter((response) => response.privacy_consent).length;
  return `
    <section class="panel stat-panel">
      <div class="stat"><span>回答数</span><strong>${state.loadingResponses ? "..." : state.responses.length}</strong></div>
      <div class="stat"><span>個別相談</span><strong>${consultation}</strong></div>
      <div class="stat"><span>提案候補</span><strong>${proposal}</strong></div>
      <div class="stat"><span>同意済み</span><strong>${consent}</strong></div>
    </section>
  `;
}

function filtersHtml() {
  return `
    <section class="panel filters">
      <input id="filterKeyword" type="search" placeholder="名前・会社・メール・回答内容で検索" value="${escapeHtml(state.filters.keyword)}" />
      <select id="filterSegment">
        <option value="">候補: すべて</option>
        <option value="consultation" ${state.filters.segment === "consultation" ? "selected" : ""}>個別相談を希望</option>
        <option value="proposal" ${state.filters.segment === "proposal" ? "selected" : ""}>提案・コース候補</option>
        <option value="none" ${state.filters.segment === "none" ? "selected" : ""}>自分で進める</option>
      </select>
      <select id="filterInterest">
        <option value="">興味: すべて</option>
        ${SERVICE_INTERESTS.map((interest) => option(interest, state.filters.interest)).join("")}
      </select>
    </section>
  `;
}

function responsesHtml(responses) {
  if (state.loadingResponses) {
    return `
      <section class="panel empty-state">
        <h3>回答を読み込み中...</h3>
      </section>
    `;
  }

  if (!responses.length) {
    return `
      <section class="panel empty-state">
        <h3>該当する回答がありません</h3>
        <p>検索条件を変えると表示されます。</p>
      </section>
    `;
  }

  return `
    <section class="response-list">
      ${responses.map(responseCard).join("")}
    </section>
  `;
}

function responseCard(response) {
  return `
    <article class="panel response-card">
      <div class="response-head">
        <div>
          <div class="response-meta">
            ${candidateBadges(response)}
            <span>${formatDate(response.created_at)}</span>
          </div>
          <h3>${escapeHtml(response.name)} / ${escapeHtml(response.company)}</h3>
          <p>${escapeHtml(response.email)} ・ ${escapeHtml(response.industry_other || response.industry)}</p>
        </div>
        <div class="interest-stack">
          ${(response.service_interest || []).map((interest) => `<span>${escapeHtml(interest)}</span>`).join("")}
        </div>
      </div>

      <dl class="detail-grid">
        <dt>印象に残った内容</dt>
        <dd>${escapeHtml(response.impression)}</dd>
        <dt>使えそうなAI活用</dt>
        <dd>${escapeHtml(response.ai_use_scene)}</dd>
        <dt>めんどうな作業</dt>
        <dd>${escapeHtml(response.tedious_task)}</dd>
        <dt>頻度</dt>
        <dd>${escapeHtml(response.task_frequency)}</dd>
        <dt>不安・疑問</dt>
        <dd>${escapeHtml(response.ai_concern)}</dd>
        <dt>次に試したいこと</dt>
        <dd>${escapeHtml(response.next_trial)}</dd>
        <dt>その他の興味</dt>
        <dd>${escapeHtml(response.service_interest_other || "未入力")}</dd>
        <dt>応援・要望</dt>
        <dd>${escapeHtml(response.support_message || "未入力")}</dd>
        <dt>感想紹介</dt>
        <dd>${escapeHtml(response.testimonial_permission || "未確認")}</dd>
        <dt>個人情報同意</dt>
        <dd>${response.privacy_consent ? "同意済み" : "未確認"}</dd>
      </dl>
    </article>
  `;
}

function candidateBadges(response) {
  const badges = [];
  if (response.consultation_candidate) badges.push('<span class="badge badge-consultation">個別相談</span>');
  if (response.proposal_candidate) badges.push('<span class="badge badge-proposal">提案候補</span>');
  if (!badges.length) badges.push('<span class="badge">通常</span>');
  return badges.join("");
}

function bindFilterActions() {
  const filterMap = {
    filterKeyword: "keyword",
    filterSegment: "segment",
    filterInterest: "interest",
  };

  Object.entries(filterMap).forEach(([id, key]) => {
    $(`#${id}`)?.addEventListener(id === "filterKeyword" ? "input" : "change", (event) => {
      state.filters[key] = event.target.value;
      $("#responseResults").innerHTML = responsesHtml(filteredResponses());
    });
  });
}

function filteredResponses() {
  const keyword = state.filters.keyword.trim().toLowerCase();
  return [...state.responses]
    .filter((response) => {
      const noOfferInterest = (response.service_interest || []).includes("今はまだ結構です、自分で進めてみます");
      const haystack = [
        response.name,
        response.company,
        response.email,
        response.industry,
        response.industry_other,
        response.impression,
        response.ai_use_scene,
        response.tedious_task,
        response.task_frequency,
        response.ai_concern,
        response.next_trial,
        ...(response.service_interest || []),
        response.service_interest_other,
        response.support_message,
        response.testimonial_permission,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || haystack.includes(keyword)) &&
        (!state.filters.interest || (response.service_interest || []).includes(state.filters.interest)) &&
        (!state.filters.segment ||
          (state.filters.segment === "consultation" && response.consultation_candidate) ||
          (state.filters.segment === "proposal" && response.proposal_candidate) ||
          (state.filters.segment === "none" && noOfferInterest))
      );
    })
    .sort(
      (a, b) =>
        Number(b.consultation_candidate) - Number(a.consultation_candidate) ||
        Number(b.proposal_candidate) - Number(a.proposal_candidate) ||
        new Date(b.created_at) - new Date(a.created_at),
    );
}

function exportCsv() {
  const headers = [
    "回答日時",
    "名前",
    "会社名・屋号",
    "メールアドレス",
    "業種",
    "印象に残った内容",
    "使えそうなAI活用",
    "めんどうな作業",
    "発生頻度",
    "AIへの不安・疑問",
    "次に試したいこと",
    "サポートへの興味",
    "その他の興味",
    "応援・要望",
    "感想紹介の可否",
    "個人情報同意",
    "個別相談候補",
    "提案候補",
  ];

  const rows = filteredResponses().map((response) => [
    formatDate(response.created_at),
    response.name,
    response.company,
    response.email,
    response.industry_other || response.industry,
    response.impression,
    response.ai_use_scene,
    response.tedious_task,
    response.task_frequency,
    response.ai_concern,
    response.next_trial,
    (response.service_interest || []).join(" / "),
    response.service_interest_other,
    response.support_message,
    response.testimonial_permission,
    response.privacy_consent ? "同意済み" : "未確認",
    response.consultation_candidate ? "あり" : "",
    response.proposal_candidate ? "あり" : "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `seminar-followup-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function text(formData, key) {
  return String(formData.get(key) || "").trim();
}

function splitList(value) {
  return String(value || "")
    .split(/[／/,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function option(value, selected) {
  return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
