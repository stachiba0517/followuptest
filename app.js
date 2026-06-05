const STORAGE_KEY = "followupSurvey.v20260522.responses";
const MOCK_LOGIN = {
  id: "nakamura",
  password: "mvp-preview",
};

const SERVICE_INTERESTS = [
  "今はまだ結構です、自分で進めてみます",
  "個別相談を希望",
  "3回コース勉強会に興味がある",
  "1日集中コースに興味がある",
  "3か月〜半年伴走に興味がある",
  "その他",
];

const SAMPLE_RESPONSES = [
  {
    id: "sample-1",
    created_at: "2026-05-22T10:12:00.000Z",
    name: "山田 花子",
    company: "山田デザイン事務所",
    email: "hanako@example.com",
    industry: "個人事業・ひとり社長",
    industry_other: "",
    impression: "AIで提案書のたたき台を作ってから、人間が整える流れが印象に残りました。",
    ai_use_scene: "問い合わせ後の返信文、見積の前段階の整理、SNS投稿の下書きに使えそうです。",
    tedious_task: "毎回似たような問い合わせ返信と、相談内容の整理に時間がかかっています。",
    task_frequency: "週に数回",
    ai_concern: "個人情報をどこまで入れてよいか、間違った回答を信じてしまわないかが不安です。",
    next_trial: "まずは過去の問い合わせをもとに、返信テンプレートを作ってみたいです。",
    service_interest: ["個別相談を希望", "3回コース勉強会に興味がある"],
    service_interest_other: "",
    support_message: "今日の内容はかなり現実的で、自分でも試せそうでした。",
    testimonial_permission: "イニシャル・匿名ならOK",
    privacy_consent: true,
  },
  {
    id: "sample-2",
    created_at: "2026-05-22T11:35:00.000Z",
    name: "佐藤 一郎",
    company: "サトウ製作所",
    email: "sato@example.com",
    industry: "製造",
    industry_other: "",
    impression: "小さな業務からAI化してよい、という話がわかりやすかったです。",
    ai_use_scene: "社内向けの作業手順書づくりと、メール文面の作成に使えそうです。",
    tedious_task: "発注内容を確認して、社内共有用にまとめ直す作業です。",
    task_frequency: "毎日",
    ai_concern: "社員にどう説明すれば使ってもらえるかが不安です。",
    next_trial: "1つの定型メールをAIで作り直してみます。",
    service_interest: ["1日集中コースに興味がある", "3か月〜半年伴走に興味がある"],
    service_interest_other: "",
    support_message: "",
    testimonial_permission: "お名前つきで紹介OK",
    privacy_consent: true,
  },
  {
    id: "sample-3",
    created_at: "2026-05-22T13:20:00.000Z",
    name: "田中 美咲",
    company: "tanaka salon",
    email: "misaki@example.com",
    industry: "サービス",
    industry_other: "",
    impression: "SNS投稿も、いきなり完成を目指さず素材整理から始めてよいとわかりました。",
    ai_use_scene: "Instagram投稿のネタ出し、ブログの見出し作りに使えそうです。",
    tedious_task: "投稿ネタを考える作業が毎回止まります。",
    task_frequency: "週1回",
    ai_concern: "自分らしさがなくならないかが気になります。",
    next_trial: "投稿案を10個出してもらい、自分の言葉に直すところからやります。",
    service_interest: ["今はまだ結構です、自分で進めてみます"],
    service_interest_other: "",
    support_message: "また事例が聞けるとうれしいです。",
    testimonial_permission: "紹介は控えてください",
    privacy_consent: true,
  },
];

const state = {
  responses: [],
  activeView: "form",
  adminUnlocked: false,
  filters: {
    keyword: "",
    segment: "",
    interest: "",
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function init() {
  loadResponses();
  setupNavigation();
  renderServiceChoices();
  setupConditionalFields();
  setupSurveyForm();
  setupAdminLogin();
}

function loadResponses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state.responses = Array.isArray(stored) ? stored.map(normalizeResponse) : cloneSamples();
  } catch {
    state.responses = cloneSamples();
  }
  saveResponses();
}

function cloneSamples() {
  return SAMPLE_RESPONSES.map((response) => normalizeResponse({ ...response }));
}

function saveResponses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.responses));
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

function setupSurveyForm() {
  $("#surveyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const serviceInterest = formData.getAll("service_interest");

    if (!serviceInterest.length) {
      alert("サポートへの興味を1つ以上選んでください。");
      return;
    }

    const response = normalizeResponse({
      id: `response-${Date.now()}`,
      created_at: new Date().toISOString(),
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
    });

    state.responses.unshift(response);
    saveResponses();
    form.reset();
    $("#industryOtherField").hidden = true;
    $("#serviceOtherField").hidden = true;
    switchView("complete");
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
  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("#loginId").value !== MOCK_LOGIN.id || $("#loginPassword").value !== MOCK_LOGIN.password) {
      alert("IDまたはパスワードが違います。");
      return;
    }
    state.adminUnlocked = true;
    $("#adminLock").hidden = true;
    $("#adminApp").hidden = false;
    renderAdmin();
  });

  $("#exportCsv").addEventListener("click", exportCsv);
  $("#reloadMockData").addEventListener("click", () => {
    state.responses = cloneSamples();
    saveResponses();
    renderAdmin();
  });
}

function renderAdmin() {
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
      <div class="stat"><span>回答数</span><strong>${state.responses.length}</strong></div>
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
