const STORAGE_KEYS = {
  leads: "followupMvp.leads",
  menus: "followupMvp.menus",
  logs: "followupMvp.logs",
  seeded: "followupMvp.seeded",
};

const DEFAULT_PASSCODE = "nakamura-mvp";

const DEFAULT_MENUS = [
  {
    menu_id: "mini",
    menu_name: "ミニ実装",
    description: "小さな業務ツール、フォーム、資料生成フローを短期間で作る。",
    target: "事務、資料作成、定型作業を小さく試したい人",
    price_min: 50000,
    price_max: 150000,
    deliverables: "小規模ツール、操作手順、改善メモ",
    keywords: ["事務", "資料", "定型", "効率", "フォーム", "顧客対応"],
  },
  {
    menu_id: "ceo-ai",
    menu_name: "社長AI / AI右腕伴走",
    description: "経営判断、業務棚卸し、AI活用設計を定例で伴走する。",
    target: "経営判断や業務設計を相談したい人",
    price_min: 150000,
    price_max: 500000,
    deliverables: "業務棚卸し、AI活用設計、定例伴走ログ",
    keywords: ["経営", "判断", "業務設計", "社長", "全体", "伴走"],
  },
  {
    menu_id: "media",
    menu_name: "Media Intelligence",
    description: "動画、音声、文字起こしから投稿案、LP素材、提案素材を作る。",
    target: "発信素材や専門知見を商品化したい人",
    price_min: 100000,
    price_max: 350000,
    deliverables: "投稿案、LP素材、提案素材、素材変換フロー",
    keywords: ["発信", "動画", "音声", "文字起こし", "LP", "投稿"],
  },
  {
    menu_id: "followup",
    menu_name: "勉強会後フォロー支援",
    description: "勉強会やセミナー後の相談カルテ、打診導線、提案導線を作る。",
    target: "勉強会やセミナーを案件化したい人",
    price_min: 200000,
    price_max: 500000,
    deliverables: "相談カルテ、優先打診リスト、提案導線、案件ログ",
    keywords: ["勉強会", "セミナー", "フォロー", "案件化", "相談カルテ"],
  },
  {
    menu_id: "expert",
    menu_name: "専門家向けAI活用支援",
    description: "専門知識を顧客説明資料、提案素材、業務フローに変換する。",
    target: "経理コンサル、社労士、士業、専門家",
    price_min: 120000,
    price_max: 400000,
    deliverables: "専門知見整理、顧客説明資料、提案素材",
    keywords: ["士業", "経理", "労務", "専門", "説明", "資料"],
  },
];

const SAMPLE_LEADS = [
  {
    id: "sample-1",
    created_at: new Date().toISOString(),
    event_name: "AI活用勉強会",
    name: "山田 花子",
    company: "山田デザイン事務所",
    email: "sample@example.com",
    phone: "",
    industry: "サービス",
    business_size: "1人",
    pain: "問い合わせ対応と提案資料づくりが毎回手作業で、繁忙期に返信が遅れがちです。",
    ai_interest: ["資料作成", "顧客対応", "発信"],
    ai_interest_other: "",
    impression: "小さな業務からAI化できるという話が印象に残りました。",
    consultation_topic: "提案書のたたき台を自動で作れるか相談したいです。",
    consultation_need: "希望する",
    timing: "1か月以内",
    budget: "10〜30万円",
    contact_method: "メール",
    priority: "高",
    recommended_menus: ["mini", "media"],
    next_questions: ["毎月どの資料を何件作っているか", "提案資料の元データはどこにあるか"],
    followup_status: "未打診",
    nakamura_note: "",
  },
];

const state = {
  leads: [],
  menus: [],
  logs: [],
  activeView: "form",
  adminUnlocked: false,
  adminTab: "dashboard",
  selectedLeadId: null,
  search: "",
  priorityFilter: "",
  statusFilter: "",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setupData() {
  state.menus = loadJson(STORAGE_KEYS.menus, DEFAULT_MENUS);
  state.leads = loadJson(STORAGE_KEYS.leads, []);
  state.logs = loadJson(STORAGE_KEYS.logs, []);

  if (!localStorage.getItem(STORAGE_KEYS.seeded)) {
    state.leads = SAMPLE_LEADS;
    saveJson(STORAGE_KEYS.leads, state.leads);
    saveJson(STORAGE_KEYS.menus, state.menus);
    localStorage.setItem(STORAGE_KEYS.seeded, "true");
  }

  state.selectedLeadId = state.leads[0]?.id ?? null;
}

function switchView(viewName) {
  state.activeView = viewName;
  $$(".view").forEach((view) => view.classList.remove("is-active"));
  $(`#${viewName}View`)?.classList.add("is-active");
  $$(".nav-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  if (viewName === "admin" && state.adminUnlocked) renderAdmin();
}

function setupNavigation() {
  $$("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
}

function collectFormData(form) {
  const formData = new FormData(form);
  const aiInterest = formData.getAll("ai_interest");
  return {
    id: `lead-${Date.now()}`,
    created_at: new Date().toISOString(),
    event_name: String(formData.get("event_name") || "AI活用勉強会").trim(),
    name: String(formData.get("name") || "").trim(),
    company: String(formData.get("company") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    industry: String(formData.get("industry") || "").trim(),
    industry_other: String(formData.get("industry_other") || "").trim(),
    business_size: String(formData.get("business_size") || "").trim(),
    pain: String(formData.get("pain") || "").trim(),
    ai_interest: aiInterest,
    ai_interest_other: String(formData.get("ai_interest_other") || "").trim(),
    impression: String(formData.get("impression") || "").trim(),
    consultation_topic: String(formData.get("consultation_topic") || "").trim(),
    consultation_need: String(formData.get("consultation_need") || "").trim(),
    timing: String(formData.get("timing") || "").trim(),
    budget: String(formData.get("budget") || "").trim(),
    contact_method: String(formData.get("contact_method") || "").trim(),
    priority: "",
    recommended_menus: [],
    next_questions: [],
    followup_status: "未打診",
    nakamura_note: "",
  };
}

function setupLeadForm() {
  $("#leadForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const aiChecked = $$("input[name='ai_interest']:checked").length > 0;
    const aiOther = $("input[name='ai_interest_other']").value.trim();
    if (!aiChecked && !aiOther) {
      alert("AIで改善したい業務を1つ以上選ぶか、その他欄に入力してください。");
      return;
    }

    const lead = enrichLead(collectFormData(event.currentTarget));
    state.leads.unshift(lead);
    saveJson(STORAGE_KEYS.leads, state.leads);
    state.selectedLeadId = lead.id;
    event.currentTarget.reset();
    switchView("complete");
  });
}

function enrichLead(lead) {
  const priority = lead.priority || calculatePriority(lead);
  const recommended = recommendMenus(lead);
  return {
    ...lead,
    priority,
    recommended_menus: lead.recommended_menus?.length ? lead.recommended_menus : recommended,
    next_questions: lead.next_questions?.length ? lead.next_questions : buildNextQuestions(lead),
  };
}

function calculatePriority(lead) {
  if (lead.consultation_need === "今は不要") return "低";

  let score = 0;
  if (lead.consultation_need === "希望する") score += 3;
  if (lead.consultation_need === "興味あり") score += 1;
  if (["すぐ", "1か月以内"].includes(lead.timing)) score += 2;
  if (lead.timing === "3か月以内") score += 1;
  if (["10〜30万円", "30万円以上"].includes(lead.budget)) score += 2;
  if ((lead.pain || "").length >= 35) score += 1;
  if ([...(lead.ai_interest || []), lead.ai_interest_other].filter(Boolean).length > 0) score += 1;

  if (score >= 4) return "高";
  if (score >= 2) return "中";
  return "低";
}

function recommendMenus(lead) {
  const text = [
    lead.industry,
    lead.industry_other,
    lead.pain,
    ...(lead.ai_interest || []),
    lead.ai_interest_other,
    lead.consultation_topic,
    lead.impression,
  ]
    .filter(Boolean)
    .join(" ");

  const scored = state.menus.map((menu) => {
    const score = (menu.keywords || []).reduce((sum, keyword) => {
      return text.includes(keyword) ? sum + 1 : sum;
    }, 0);
    return { id: menu.menu_id, score };
  });

  const selected = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.id);

  return selected.length ? selected : ["mini", "ceo-ai"];
}

function buildNextQuestions(lead) {
  const questions = [];
  if (lead.pain) questions.push("その困りごとは、月に何時間くらい発生していますか");
  if ((lead.ai_interest || []).includes("資料作成")) questions.push("よく作る資料の種類と元データは何ですか");
  if ((lead.ai_interest || []).includes("発信")) questions.push("発信素材は動画、音声、メモのどれが多いですか");
  if ((lead.ai_interest || []).includes("営業")) questions.push("問い合わせから提案までの流れをどこで止まりやすいですか");
  if (!lead.budget || lead.budget === "未定") questions.push("初回はどの程度の予算幅で試したいですか");
  if (!lead.timing || lead.timing === "未定") questions.push("いつまでに改善できると一番助かりますか");
  return questions.slice(0, 4);
}

function setupAdminLogin() {
  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("#passcode").value === DEFAULT_PASSCODE) {
      state.adminUnlocked = true;
      $("#adminLock").hidden = true;
      $("#adminApp").hidden = false;
      renderAdmin();
    } else {
      alert("パスコードが違います。");
    }
  });

  $(".admin-side").addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-tab]");
    if (!button) return;
    state.adminTab = button.dataset.adminTab;
    renderAdmin();
  });

  $("#exportCsv").addEventListener("click", exportCsv);
}

function renderAdmin() {
  $$(".side-button[data-admin-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === state.adminTab);
  });

  const renderers = {
    dashboard: renderDashboard,
    leads: renderLeads,
    priority: renderPriority,
    caseLog: renderCaseLog,
    menus: renderMenus,
  };

  $("#adminContent").innerHTML = renderers[state.adminTab]();
  bindAdminActions();
}

function renderDashboard() {
  const high = state.leads.filter((lead) => lead.priority === "高").length;
  const needFollow = state.leads.filter((lead) => lead.followup_status === "未打診").length;
  const latest = state.leads.slice(0, 5);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Dashboard</p>
          <h2>ダッシュボード</h2>
        </div>
        <button class="secondary" data-seed-reset>サンプルを再投入</button>
      </div>
      <div class="stat-grid">
        <div class="stat"><span>回答数</span><strong>${state.leads.length}</strong></div>
        <div class="stat"><span>優先度 高</span><strong>${high}</strong></div>
        <div class="stat"><span>未打診</span><strong>${needFollow}</strong></div>
      </div>
      ${latest.length ? leadTable(latest, true) : emptyState()}
    </section>
    <section class="panel">
      <h3>次に見るべき候補</h3>
      ${priorityCards(state.leads.filter((lead) => lead.priority !== "低").slice(0, 4))}
    </section>
  `;
}

function renderLeads() {
  const leads = filteredLeads();
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Responses</p>
          <h2>回答一覧</h2>
        </div>
      </div>
      ${filterToolbar()}
      ${leads.length ? leadTable(leads, true) : emptyState()}
    </section>
    ${state.selectedLeadId ? renderLeadDetail(getLead(state.selectedLeadId)) : ""}
  `;
}

function renderPriority() {
  const leads = [...state.leads].sort(prioritySort);
  return `
    <section class="panel">
      <p class="eyebrow">Priority</p>
      <h2>優先打診リスト</h2>
      ${leads.length ? priorityCards(leads) : emptyState()}
    </section>
  `;
}

function renderCaseLog() {
  const lead = getLead(state.selectedLeadId) || state.leads[0];
  const logs = state.logs.filter((log) => !lead || log.lead_id === lead.id);
  return `
    <section class="panel">
      <p class="eyebrow">Case log</p>
      <h2>簡易案件ログ</h2>
      ${state.leads.length ? leadPicker(lead?.id) : emptyState()}
      ${lead ? caseLogForm(lead) : ""}
    </section>
    <section class="panel">
      <h3>選択中の顧客ログ</h3>
      ${logs.length ? logs.map(logItem).join("") : '<p class="muted">まだログがありません。</p>'}
    </section>
  `;
}

function renderMenus() {
  return `
    <section class="panel">
      <p class="eyebrow">Menu master</p>
      <h2>メニュー管理</h2>
      <p class="muted">価格帯、説明文、キーワードを編集できます。キーワードはカンマ区切りです。</p>
      <div class="menu-list">
        ${state.menus.map(menuEditor).join("")}
      </div>
    </section>
  `;
}

function bindAdminActions() {
  $$("[data-select-lead]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLeadId = button.dataset.selectLead;
      state.adminTab = "leads";
      renderAdmin();
      setTimeout(() => $("#leadDetail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    });
  });

  $("#filterSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderAdmin();
  });
  $("#filterPriority")?.addEventListener("change", (event) => {
    state.priorityFilter = event.target.value;
    renderAdmin();
  });
  $("#filterStatus")?.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderAdmin();
  });

  $("#leadUpdateForm")?.addEventListener("submit", saveLeadUpdate);
  $("#caseLogForm")?.addEventListener("submit", saveCaseLog);
  $("#leadPicker")?.addEventListener("change", (event) => {
    state.selectedLeadId = event.target.value;
    renderAdmin();
  });

  $$("[data-menu-form]").forEach((form) => {
    form.addEventListener("submit", saveMenu);
  });

  $("[data-seed-reset]")?.addEventListener("click", () => {
    if (!confirm("サンプルデータを先頭に再投入しますか。既存データは残ります。")) return;
    state.leads = SAMPLE_LEADS.map((lead) => ({ ...lead, id: `sample-${Date.now()}` })).concat(state.leads);
    saveJson(STORAGE_KEYS.leads, state.leads);
    state.selectedLeadId = state.leads[0].id;
    renderAdmin();
  });
}

function filterToolbar() {
  return `
    <div class="toolbar">
      <input id="filterSearch" type="search" placeholder="氏名、会社名、課題で検索" value="${escapeHtml(state.search)}" />
      <select id="filterPriority">
        <option value="">優先度すべて</option>
        ${["高", "中", "低"].map((value) => option(value, state.priorityFilter)).join("")}
      </select>
      <select id="filterStatus">
        <option value="">ステータスすべて</option>
        ${["未打診", "打診済", "返信あり", "個別相談予定", "見送り"].map((value) => option(value, state.statusFilter)).join("")}
      </select>
    </div>
  `;
}

function leadTable(leads, withAction = false) {
  return `
    <table class="lead-table">
      <thead>
        <tr>
          <th>氏名</th>
          <th>会社名</th>
          <th>優先度</th>
          <th>相談希望</th>
          <th>検討時期</th>
          <th>提案候補</th>
          <th>状態</th>
        </tr>
      </thead>
      <tbody>
        ${leads
          .map(
            (lead) => `
              <tr>
                <td>${
                  withAction
                    ? `<button class="table-button" data-select-lead="${lead.id}">${escapeHtml(lead.name)}</button>`
                    : escapeHtml(lead.name)
                }</td>
                <td>${escapeHtml(lead.company || "-")}</td>
                <td>${priorityBadge(lead.priority)}</td>
                <td>${escapeHtml(lead.consultation_need || "-")}</td>
                <td>${escapeHtml(lead.timing || "-")}</td>
                <td>${menuNames(lead.recommended_menus).join("<br>")}</td>
                <td>${escapeHtml(lead.followup_status || "-")}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function priorityCards(leads) {
  if (!leads.length) return emptyState();
  return `
    <div class="menu-list">
      ${leads
        .map(
          (lead) => `
            <article class="menu-card">
              <div class="panel-header">
                <div>
                  <h4>${escapeHtml(lead.name)} ${lead.company ? ` / ${escapeHtml(lead.company)}` : ""}</h4>
                  <p class="muted">${escapeHtml(lead.pain || "").slice(0, 120)}</p>
                </div>
                ${priorityBadge(lead.priority)}
              </div>
              <p><strong>相談希望:</strong> ${escapeHtml(lead.consultation_need || "-")} / <strong>検討時期:</strong> ${escapeHtml(lead.timing || "-")} / <strong>予算:</strong> ${escapeHtml(lead.budget || "-")}</p>
              <p><strong>提案候補:</strong> ${menuNames(lead.recommended_menus).join("、")}</p>
              <button class="secondary" data-select-lead="${lead.id}">カルテと打診文面を見る</button>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderLeadDetail(lead) {
  if (!lead) return "";
  const draft = buildFollowupMessage(lead);
  const proposals = buildProposal(lead);
  const recommendedMenus = getMenus(lead.recommended_menus);

  return `
    <section id="leadDetail" class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Customer chart</p>
          <h2>${escapeHtml(lead.name)}さんの相談カルテ</h2>
        </div>
        ${priorityBadge(lead.priority)}
      </div>
      <div class="detail-layout">
        <div>
          <section class="detail-section">
            <h3>顧客別相談カルテ</h3>
            ${karteHtml(lead)}
          </section>
          <section class="detail-section">
            <h3>個別相談打診文面たたき台</h3>
            <pre class="prebox">${escapeHtml(draft)}</pre>
          </section>
          <section class="detail-section">
            <h3>松竹梅の提案・見積たたき台</h3>
            <div class="proposal-grid">
              ${proposals.plans.map(proposalCard).join("")}
            </div>
            <h3>初回提案メール案</h3>
            <pre class="prebox">${escapeHtml(proposals.email)}</pre>
          </section>
        </div>
        <aside>
          <section class="detail-section">
            <h3>中村による追記</h3>
            ${leadUpdateForm(lead)}
          </section>
          <section class="detail-section">
            <h3>サポートメニュー候補</h3>
            <div class="menu-list">
              ${recommendedMenus.map(menuCard).join("")}
            </div>
          </section>
        </aside>
      </div>
    </section>
  `;
}

function karteHtml(lead) {
  const rows = [
    ["顧客名", lead.name],
    ["会社名", lead.company],
    ["業種", lead.industry_other || lead.industry],
    ["困っていること", lead.pain],
    ["AIで改善できそうな業務", [...(lead.ai_interest || []), lead.ai_interest_other].filter(Boolean).join("、")],
    ["相談意向", lead.consultation_need],
    ["検討時期", lead.timing],
    ["予算感", lead.budget],
    ["中村から見た見込み度", lead.priority],
    ["提案候補", menuNames(lead.recommended_menus).join("、")],
    ["次に聞くべき質問", (lead.next_questions || []).join("\n")],
    ["次アクション", latestLog(lead.id)?.next_action || ""],
  ];
  return `<dl class="karte">${rows.map(([key, value]) => `<dt>${key}</dt><dd>${escapeHtml(value || "-")}</dd>`).join("")}</dl>`;
}

function leadUpdateForm(lead) {
  return `
    <form id="leadUpdateForm" class="admin-form">
      <input type="hidden" name="lead_id" value="${lead.id}" />
      <label>
        優先度
        <select name="priority">
          ${["高", "中", "低"].map((value) => option(value, lead.priority)).join("")}
        </select>
      </label>
      <label>
        打診ステータス
        <select name="followup_status">
          ${["未打診", "打診済", "返信あり", "個別相談予定", "見送り"].map((value) => option(value, lead.followup_status)).join("")}
        </select>
      </label>
      <label>
        中村メモ
        <textarea name="nakamura_note" rows="5">${escapeHtml(lead.nakamura_note || "")}</textarea>
      </label>
      <button class="primary" type="submit">追記を保存</button>
    </form>
  `;
}

function caseLogForm(lead) {
  return `
    <form id="caseLogForm" class="admin-form">
      <input type="hidden" name="lead_id" value="${lead.id}" />
      <div class="row">
        <label>
          提案メニュー
          <select name="proposed_menu">${state.menus.map((menu) => option(menu.menu_name, "")).join("")}</select>
        </label>
        <label>
          提案額
          <input name="proposal_amount" type="number" min="0" step="1000" placeholder="200000" />
        </label>
      </div>
      <div class="row">
        <label>
          ステータス
          <select name="status">
            ${["未打診", "打診済", "相談予定", "提案済", "成約", "見送り"].map((value) => option(value, "")).join("")}
          </select>
        </label>
        <label>
          補助金由来タグ
          <input name="subsidy_tag" type="text" placeholder="福井収益力補助金" />
        </label>
      </div>
      <label>
        次アクション
        <textarea name="next_action" rows="3" required></textarea>
      </label>
      <label>
        次回予定日
        <input name="next_date" type="date" />
      </label>
      <button class="primary" type="submit">案件ログを追加</button>
    </form>
  `;
}

function leadPicker(selectedId) {
  return `
    <label>
      顧客を選択
      <select id="leadPicker">
        ${state.leads.map((lead) => `<option value="${lead.id}" ${lead.id === selectedId ? "selected" : ""}>${escapeHtml(lead.name)} / ${escapeHtml(lead.company || "-")}</option>`).join("")}
      </select>
    </label>
  `;
}

function menuEditor(menu) {
  return `
    <form class="menu-card admin-form" data-menu-form>
      <input type="hidden" name="menu_id" value="${menu.menu_id}" />
      <div class="row">
        <label>
          メニュー名
          <input name="menu_name" value="${escapeHtml(menu.menu_name)}" required />
        </label>
        <label>
          向いている顧客
          <input name="target" value="${escapeHtml(menu.target)}" />
        </label>
      </div>
      <label>
        説明
        <textarea name="description" rows="2">${escapeHtml(menu.description)}</textarea>
      </label>
      <div class="row">
        <label>
          最低価格
          <input name="price_min" type="number" value="${menu.price_min}" />
        </label>
        <label>
          最高価格
          <input name="price_max" type="number" value="${menu.price_max}" />
        </label>
      </div>
      <label>
        成果物
        <input name="deliverables" value="${escapeHtml(menu.deliverables)}" />
      </label>
      <label>
        判定キーワード
        <input name="keywords" value="${escapeHtml((menu.keywords || []).join(", "))}" />
      </label>
      <button class="secondary" type="submit">このメニューを保存</button>
    </form>
  `;
}

function saveLeadUpdate(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const lead = getLead(formData.get("lead_id"));
  if (!lead) return;
  lead.priority = formData.get("priority");
  lead.followup_status = formData.get("followup_status");
  lead.nakamura_note = formData.get("nakamura_note");
  saveJson(STORAGE_KEYS.leads, state.leads);
  renderAdmin();
}

function saveCaseLog(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const log = {
    id: `log-${Date.now()}`,
    lead_id: formData.get("lead_id"),
    proposed_menu: formData.get("proposed_menu"),
    proposal_amount: Number(formData.get("proposal_amount") || 0),
    status: formData.get("status"),
    next_action: formData.get("next_action"),
    next_date: formData.get("next_date"),
    subsidy_tag: formData.get("subsidy_tag"),
    updated_at: new Date().toISOString(),
  };
  state.logs.unshift(log);
  const lead = getLead(log.lead_id);
  if (lead) lead.followup_status = log.status === "相談予定" ? "個別相談予定" : lead.followup_status;
  saveJson(STORAGE_KEYS.logs, state.logs);
  saveJson(STORAGE_KEYS.leads, state.leads);
  event.currentTarget.reset();
  renderAdmin();
}

function saveMenu(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const menu = state.menus.find((item) => item.menu_id === formData.get("menu_id"));
  if (!menu) return;
  menu.menu_name = formData.get("menu_name");
  menu.description = formData.get("description");
  menu.target = formData.get("target");
  menu.price_min = Number(formData.get("price_min") || 0);
  menu.price_max = Number(formData.get("price_max") || 0);
  menu.deliverables = formData.get("deliverables");
  menu.keywords = String(formData.get("keywords") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  saveJson(STORAGE_KEYS.menus, state.menus);
  state.leads = state.leads.map((lead) => ({
    ...lead,
    recommended_menus: recommendMenus(lead),
    next_questions: buildNextQuestions(lead),
  }));
  saveJson(STORAGE_KEYS.leads, state.leads);
  renderAdmin();
}

function buildFollowupMessage(lead) {
  const firstInterest = [...(lead.ai_interest || []), lead.ai_interest_other].filter(Boolean)[0] || "業務の整理";
  return `${lead.name}さん

先日はAI勉強会へのご参加ありがとうございました。
アンケートで書いてくださった「${lead.pain || "現在の課題"}」については、
AIを使うとまず「${firstInterest}」あたりから整理できそうだと感じました。

もしよろしければ、30分ほど個別に状況を伺い、
どこから着手すると効果が出やすいか一緒に整理できます。

ご都合のよい候補日があれば教えてください。`;
}

function buildProposal(lead) {
  const menu = getMenus(lead.recommended_menus)[0] || state.menus[0];
  const amountMin = menu?.price_min || 50000;
  const amountMax = menu?.price_max || 300000;
  const mid = Math.round((amountMin + amountMax) / 2 / 10000) * 10000;
  const subject = lead.pain || "AI活用による業務改善";

  const plans = [
    {
      rank: "松",
      title: "しっかり伴走プラン",
      content: `${menu.menu_name}を中心に、業務棚卸し、設計、実装、運用定着まで伴走する。`,
      amount: amountMax,
      due: "6〜8週間",
    },
    {
      rank: "竹",
      title: "標準実装プラン",
      content: `${menu.menu_name}の主要機能を絞り、現場で使える最小構成を作る。`,
      amount: mid,
      due: "3〜5週間",
    },
    {
      rank: "梅",
      title: "ミニ実装プラン",
      content: "まず1業務に絞って、入力フォーム、テンプレート、手順を整える。",
      amount: amountMin,
      due: "1〜2週間",
    },
  ];

  const email = `${lead.name}さん

先日のご相談内容をもとに、まずは「${subject}」を対象にした進め方を整理しました。
おすすめは「${menu.menu_name}」を軸に、小さく試して効果を見ながら広げる形です。

添付または本文内に、松竹梅の進め方と概算金額をまとめています。
必要に応じて範囲を調整できますので、まずは気になる案を教えてください。`;

  return { plans, email };
}

function proposalCard(plan) {
  return `
    <article class="proposal-card">
      <strong>${plan.rank}: ${plan.title}</strong>
      <p>${escapeHtml(plan.content)}</p>
      <p><strong>想定金額:</strong> ${yen(plan.amount)}</p>
      <p><strong>納期:</strong> ${escapeHtml(plan.due)}</p>
    </article>
  `;
}

function menuCard(menu) {
  return `
    <article class="menu-card">
      <h4>${escapeHtml(menu.menu_name)}</h4>
      <p>${escapeHtml(menu.description)}</p>
      <p class="muted">${escapeHtml(menu.target)}</p>
      <p><strong>価格帯:</strong> ${yen(menu.price_min)}〜${yen(menu.price_max)}</p>
    </article>
  `;
}

function logItem(log) {
  return `
    <article class="menu-card">
      <h4>${escapeHtml(log.status)} / ${escapeHtml(log.proposed_menu || "-")}</h4>
      <p><strong>提案額:</strong> ${log.proposal_amount ? yen(log.proposal_amount) : "-"} / <strong>次回予定:</strong> ${escapeHtml(log.next_date || "-")}</p>
      <p>${escapeHtml(log.next_action || "")}</p>
      <p class="muted">${formatDate(log.updated_at)} ${log.subsidy_tag ? `/ ${escapeHtml(log.subsidy_tag)}` : ""}</p>
    </article>
  `;
}

function exportCsv() {
  const headers = [
    "id",
    "created_at",
    "event_name",
    "name",
    "company",
    "email",
    "phone",
    "industry",
    "business_size",
    "pain",
    "ai_interest",
    "consultation_need",
    "timing",
    "budget",
    "priority",
    "recommended_menus",
    "followup_status",
    "nakamura_note",
  ];

  const rows = state.leads.map((lead) =>
    headers.map((header) => {
      const value = Array.isArray(lead[header]) ? lead[header].join(" / ") : lead[header] ?? "";
      return `"${String(value).replaceAll('"', '""')}"`;
    }),
  );
  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `followup-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function filteredLeads() {
  const keyword = state.search.trim().toLowerCase();
  return state.leads.filter((lead) => {
    const haystack = [lead.name, lead.company, lead.email, lead.pain, lead.consultation_topic]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || haystack.includes(keyword)) &&
      (!state.priorityFilter || lead.priority === state.priorityFilter) &&
      (!state.statusFilter || lead.followup_status === state.statusFilter)
    );
  });
}

function getLead(id) {
  return state.leads.find((lead) => lead.id === id);
}

function getMenus(ids = []) {
  return ids.map((id) => state.menus.find((menu) => menu.menu_id === id)).filter(Boolean);
}

function menuNames(ids = []) {
  return getMenus(ids).map((menu) => escapeHtml(menu.menu_name));
}

function latestLog(leadId) {
  return state.logs.find((log) => log.lead_id === leadId);
}

function prioritySort(a, b) {
  const order = { 高: 0, 中: 1, 低: 2 };
  return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
}

function priorityBadge(priority) {
  const className = priority === "高" ? "badge-high" : priority === "中" ? "badge-mid" : "badge-low";
  return `<span class="badge ${className}">${escapeHtml(priority || "-")}</span>`;
}

function option(value, selected) {
  return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(value)}</option>`;
}

function emptyState() {
  return $("#emptyStateTemplate").innerHTML;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function init() {
  setupData();
  setupNavigation();
  setupLeadForm();
  setupAdminLogin();
}

init();
