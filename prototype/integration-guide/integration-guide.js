import "../base-path.js";

const questions = [
  {
    id: "paymentScenario",
    stage: "paymentSelection",
    title: "需要接入的支付场景属于以下哪种情况？",
    description: "先判断每笔付款是否需要用户在场并主动确认。",
    mode: "single",
    options: [
      {
        value: "active",
        title: "每笔付款都由用户主动确认",
        description: "每次支付时，用户都在 App 或网页端主动完成付款。",
      },
      {
        value: "offSession",
        title: "用户首次绑卡或支付后，还会按约定在用户不在场时发起后续扣款",
        description: "后续扣款会按约定在用户不在场时发起。",
      },
    ],
  },
  {
    id: "billingCertainty",
    stage: "paymentSelection",
    condition: (answers) => answers.paymentScenario === "offSession",
    title: "后续扣款的金额和周期，是否能在签约时确认？",
    description: "扣款计划是否确定，是订阅与协议代扣之间的关键区别。",
    mode: "single",
    options: [
      {
        value: "fixed",
        title: "能，按照事先约定的扣款计划扣款。",
        description: "签约时可以明确扣款金额、周期和续费规则。",
      },
      {
        value: "flexible",
        title: "不能，扣款的金额和时间会灵活变化，无法事先确定。",
        description: "扣款金额、时间或触发条件无法在签约时确定。",
      },
    ],
  },
  {
    id: "goodsType",
    stage: "paymentSelection",
    title: "是否是销售会员及其他权益等虚拟商品？",
    description: "商品类型会影响 App 内支付场景可使用的产品。",
    mode: "single",
    options: [
      { value: "virtual", title: "是", description: "销售会员、订阅权益或其他虚拟商品。" },
      { value: "other", title: "否", description: "销售实体商品、线下服务或其他非虚拟商品。" },
    ],
  },
  {
    id: "paymentEnvironment",
    stage: "paymentSelection",
    title: "用户会在哪种支付环境中完成付款？",
    description: "选择实际需要覆盖的客户端环境。",
    mode: "single",
    options: [
      { value: "app", title: "App 内", description: "支付流程只发生在移动应用内。" },
      { value: "web", title: "网页端", description: "支付流程只发生在网页或 H5 页面。" },
      { value: "both", title: "两者均有", description: "同时覆盖 App 内和网页端支付。" },
    ],
  },
  {
    id: "markets",
    stage: "markets",
    label: "目标市场",
    short: "确定市场范围",
    title: "你的业务计划在哪些市场收款？",
    description: "可以多选。市场范围将影响支付方式、币种与准入评估。",
    mode: "multiple",
    options: [
      { value: "sea", title: "东南亚", description: "新加坡、马来西亚、泰国、印度尼西亚、菲律宾等。" },
      { value: "eastAsia", title: "东亚", description: "日本、韩国、中国内地及中国香港等。" },
      { value: "europe", title: "欧洲", description: "欧元区与英国等欧洲市场。" },
      { value: "northAmerica", title: "北美", description: "美国与加拿大。" },
      { value: "latam", title: "拉丁美洲", description: "巴西、墨西哥等拉美市场。" },
      { value: "global", title: "多个区域或全球", description: "需要同时评估跨区域支付方式组合。" },
    ],
  },
  {
    id: "refundHandling",
    stage: "postTransaction",
    label: "交易后处理",
    short: "确认售后能力",
    title: "打算如何处理退款？",
    description: "退款入口和处理自动化程度，将决定是否需要接入退款能力以及采用哪种发起方式。",
    mode: "single",
    options: [
      {
        value: "none",
        title: "没有退款场景",
        description: "业务不需要向用户退回已经完成的交易款项。",
      },
      {
        value: "dashboardException",
        title: "不提供线上申请退款入口",
        description: "如有特殊情况需要退款，由运营人员人工处理。",
      },
      {
        value: "dashboardApproval",
        title: "提供线上申请退款入口，批准后运营人工处理",
        description: "用户在线申请，审批通过后由运营人员执行退款。",
      },
      {
        value: "api",
        title: "提供线上申请退款入口，批准后系统自动处理",
        description: "用户在线申请，审批通过后由业务系统自动发起退款。",
      },
    ],
  },
  {
    id: "fundModel",
    stage: "fundModel",
    label: "资金处理",
    short: "确认资金模型",
    title: "交易资金最终如何分配？",
    description: "业务模式决定是否只需常规结算，或还需要平台分账与余额能力。",
    mode: "single",
    options: [
      {
        value: "merchant",
        title: "结算给一个业务主体",
        description: "交易资金按约定周期结算至商户账户。",
      },
      {
        value: "split",
        title: "一笔交易分配给多个参与方",
        description: "平台、店铺、达人或服务商等参与方需要按规则分账。",
      },
      {
        value: "platform",
        title: "平台还需要向子商户收款或转账",
        description: "除分账外，还涉及商户余额支付或平台转账。",
      },
      {
        value: "unsure",
        title: "暂时不确定",
        description: "先按传统型商户结算评估，再确认平台资金需求。",
      },
    ],
  },
  {
    id: "operations",
    stage: "operations",
    label: "运营与财务",
    short: "补充配套能力",
    title: "还需要哪些运营或财务能力？",
    description: "可以多选。这些能力会被加入最终接入清单。",
    mode: "multiple",
    options: [
      { value: "reconciliation", title: "自动化对账", description: "通过 API、TOS 或离线表获取交易、资金与结算账单。" },
      { value: "fx", title: "换汇", description: "支付币种、标价币种或结算币种之间存在差异。" },
      { value: "marketing", title: "支付营销", description: "提供支付立减等权益，促进支付转化或方式选择。" },
      { value: "tax", title: "计税与开票", description: "交易过程中需要计算税费，并生成正向或逆向发票。" },
      { value: "basic", title: "先使用基础能力", description: "当前只需要标准账单和基础对账能力。" },
    ],
  },
];

const stages = [
  {
    id: "paymentSelection",
    label: "收款方式",
    short: "确定支付产品",
  },
  {
    id: "markets",
    label: "目标市场",
    short: "确定市场范围",
  },
  {
    id: "postTransaction",
    label: "交易后处理",
    short: "确定退款方式",
  },
  {
    id: "fundModel",
    label: "资金处理",
    short: "确认资金模型",
  },
  {
    id: "operations",
    label: "运营与财务",
    short: "补充配套能力",
  },
];

const productRecommendations = {
  iap: {
    name: "IAP",
    description: "适用于在 App 内销售会员或其他虚拟商品，并由用户主动确认付款的场景。",
  },
  online: {
    name: "在线支付",
    description: "适合每笔交易都由用户主动确认，并选择支付方式完成付款的场景。",
  },
  iapOnline: {
    name: "IAP、在线支付",
    description: "App 内虚拟商品使用 IAP，同时通过在线支付覆盖网页端的主动付款场景。",
  },
  subscription: {
    name: "订阅",
    description: "适合具有明确套餐、权益周期和续费规则，并需要周期性自动收费的场景。",
  },
  iapSubscription: {
    name: "IAP、订阅",
    description: "App 内虚拟商品使用 IAP，同时通过订阅覆盖网页端的固定计划续费场景。",
  },
  mandate: {
    name: "协议代扣",
    description: "适合用户完成授权后，由业务规则决定扣款时间、金额与触发条件的场景。",
  },
  unavailable: {
    name: "暂无可用产品",
    description: "当前组合暂时没有匹配的产品，需要调整支付环境或进一步确认业务方案。",
  },
};

const marketRecommendations = {
  sea: ["本地数字钱包", "实时支付", "银行卡"],
  eastAsia: ["本地数字钱包", "银行卡", "扫码支付"],
  europe: ["银行卡", "数字钱包", "银行转账"],
  northAmerica: ["银行卡", "数字钱包", "先买后付"],
  latam: ["本地实时支付", "数字钱包", "银行卡"],
  global: ["全球银行卡", "本地数字钱包", "银行类支付方式"],
};

const state = {
  current: 0,
  answers: {},
  showingResult: false,
};

const progressList = document.querySelector("[data-progress-list]");
const questionView = document.querySelector("[data-question-view]");
const resultView = document.querySelector("[data-result-view]");
const optionGrid = document.querySelector("[data-option-grid]");
const questionTitle = document.querySelector("[data-question-title]");
const questionDescription = document.querySelector("[data-question-description]");
const stepLabel = document.querySelector("[data-step-label]");
const progressLabel = document.querySelector("[data-progress-label]");
const selectionHint = document.querySelector("[data-selection-hint]");
const backButton = document.querySelector("[data-back]");
const nextButton = document.querySelector("[data-next]");
const selectorActions = document.querySelector("[data-selector-actions]");
const snapshot = document.querySelector("[data-selection-snapshot]");
const restartButtons = document.querySelectorAll("[data-restart]");
const resultPrimary = document.querySelector("[data-result-primary]");
const resultGrid = document.querySelector("[data-result-grid]");
const editAnswers = document.querySelector("[data-edit-answers]");
const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector(".main-nav");
const header = document.querySelector("[data-header]");

function getAnswer(question) {
  return state.answers[question.id];
}

function hasAnswer(question) {
  const answer = getAnswer(question);
  return question.mode === "multiple" ? Array.isArray(answer) && answer.length > 0 : Boolean(answer);
}

function visibleQuestions() {
  return questions.filter((question) => !question.condition || question.condition(state.answers));
}

function questionsForStage(stageId) {
  return visibleQuestions().filter((question) => question.stage === stageId);
}

function isStageComplete(stageId) {
  const stageQuestions = questionsForStage(stageId);
  return stageQuestions.length > 0 && stageQuestions.every(hasAnswer);
}

function activeStageId() {
  return visibleQuestions()[state.current]?.stage || stages[stages.length - 1].id;
}

function getProductRecommendation() {
  const scenario = state.answers.paymentScenario;
  const certainty = state.answers.billingCertainty;
  const goodsType = state.answers.goodsType;
  const environment = state.answers.paymentEnvironment;

  if (!scenario || !goodsType || !environment) return null;
  if (scenario === "offSession" && !certainty) return null;

  if (scenario === "active") {
    if (goodsType === "other") return productRecommendations.online;
    if (environment === "app") return productRecommendations.iap;
    if (environment === "web") return productRecommendations.online;
    return productRecommendations.iapOnline;
  }

  if (certainty === "fixed") {
    if (goodsType === "other") return productRecommendations.mandate;
    if (environment === "app") return productRecommendations.iap;
    if (environment === "web") return productRecommendations.subscription;
    return productRecommendations.iapSubscription;
  }

  if (goodsType === "other") return productRecommendations.mandate;
  if (environment === "app") return productRecommendations.unavailable;
  return productRecommendations.mandate;
}

function renderProgress() {
  const currentStage = activeStageId();
  progressList.innerHTML = stages
    .map((stage, index) => {
      const complete = isStageComplete(stage.id);
      const active = !state.showingResult && stage.id === currentStage;
      const marker = complete ? "✓" : String(index + 1);
      return `
        <li class="progress-item${active ? " active" : ""}${complete ? " complete" : ""}">
          <i class="progress-marker">${marker}</i>
          <div>
            <strong>${stage.label}</strong>
            <small>${stage.short}</small>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderQuestion() {
  const currentQuestions = visibleQuestions();
  const question = currentQuestions[state.current];
  const answer = getAnswer(question);
  const stage = stages.find((item) => item.id === question.stage);
  const stageQuestions = questionsForStage(question.stage);
  const questionPosition = stageQuestions.findIndex((item) => item.id === question.id) + 1;
  const stageIndex = stages.findIndex((item) => item.id === question.stage) + 1;

  stepLabel.textContent =
    question.id === "paymentScenario"
      ? stage.label
      : stageQuestions.length > 1
        ? `${stage.label} ${questionPosition} / ${stageQuestions.length}`
        : stage.label;
  progressLabel.textContent = `${stageIndex} / ${stages.length}`;
  questionTitle.textContent = question.title;
  questionDescription.textContent = question.description;
  selectionHint.textContent = question.mode === "multiple" ? "可多选，至少选择一项" : "请选择一项";

  optionGrid.innerHTML = question.options
    .map((option) => {
      const selected =
        question.mode === "multiple"
          ? Array.isArray(answer) && answer.includes(option.value)
          : answer === option.value;
      return `
        <button
          class="selector-option${selected ? " selected" : ""}"
          type="button"
          role="${question.mode === "multiple" ? "checkbox" : "radio"}"
          aria-checked="${selected}"
          data-option="${option.value}"
          data-mode="${question.mode}"
        >
          <strong>${option.title}</strong>
          <small>${option.description}</small>
          <i class="option-control" aria-hidden="true">✓</i>
        </button>
      `;
    })
    .join("");

  optionGrid.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => selectOption(question, button.dataset.option));
  });

  backButton.disabled = state.current === 0;
  nextButton.disabled = !hasAnswer(question);
  nextButton.innerHTML =
    state.current === currentQuestions.length - 1 ? '生成建议 <span>→</span>' : '继续 <span>→</span>';
}

function selectOption(question, value) {
  if (question.mode === "single") {
    state.answers[question.id] = value;
    if (question.id === "paymentScenario" && value === "active") {
      delete state.answers.billingCertainty;
    }
  } else {
    const current = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];
    const exclusiveValues =
      question.id === "operations" ? ["basic"] : ["global"];

    if (exclusiveValues.includes(value)) {
      state.answers[question.id] = current.length === 1 && current[0] === value ? [] : [value];
    } else {
      const withoutExclusive = current.filter((item) => !exclusiveValues.includes(item));
      state.answers[question.id] = withoutExclusive.includes(value)
        ? withoutExclusive.filter((item) => item !== value)
        : [...withoutExclusive, value];
    }
  }

  persistState();
  renderQuestion();
  renderProgress();
  renderSnapshot();
}

function renderSnapshot() {
  const product = getProductRecommendation();
  if (!product) {
    snapshot.innerHTML = `
      <span>当前建议</span>
      <strong>完成收款方式问题后生成</strong>
      <p>系统会根据支付场景、商品类型和支付环境给出建议。</p>
    `;
    return;
  }

  const completed = stages.filter((stage) => isStageComplete(stage.id)).length;
  snapshot.innerHTML = `
    <span>当前建议</span>
    <strong>${product.name}</strong>
    <p>已完成 ${completed} 个选型阶段，继续补充可获得完整组合。</p>
  `;
}

function labelsFor(questionId) {
  const question = questions.find((item) => item.id === questionId);
  const answer = state.answers[questionId];
  const values = Array.isArray(answer) ? answer : [answer];
  return question.options.filter((option) => values.includes(option.value)).map((option) => option.title);
}

function unique(values) {
  return [...new Set(values)];
}

function buildResults() {
  const product = getProductRecommendation();
  const markets = state.answers.markets || [];
  const paymentMethods = unique(markets.flatMap((market) => marketRecommendations[market] || []));
  const refundHandling = state.answers.refundHandling;
  const fundModel = state.answers.fundModel;
  const operations = state.answers.operations || [];

  const refundRecommendation = {
    none: {
      title: "不接入退款",
      body: "当前业务没有退款场景，无需接入退款产品。",
      tags: ["无需接入"],
    },
    dashboardException: {
      title: "Dashboard 退款",
      body: "由运营人员在特殊情况下，通过 Dashboard 人工发起退款。",
      tags: ["人工发起", "无需 API 集成"],
    },
    dashboardApproval: {
      title: "Dashboard 退款",
      body: "线上审批通过后，由运营人员通过 Dashboard 人工发起退款。",
      tags: ["线上审批", "运营处理"],
    },
    api: {
      title: "API 退款",
      body: "线上审批通过后，由业务系统调用 API 自动发起退款。",
      tags: ["系统发起", "API 集成"],
    },
  }[refundHandling];

  const fundCapabilities = {
    merchant: ["商户结算", "标准余额账户"],
    split: ["平台分账", "商户结算"],
    platform: ["平台分账", "商户余额支付", "平台转账"],
    unsure: ["商户结算", "平台资金需求评估"],
  }[fundModel];

  const operationCapabilities = operations.includes("basic")
    ? ["标准账单", "Dashboard 对账"]
    : labelsFor("operations");

  resultPrimary.innerHTML = `
    <span>建议收单产品</span>
    <h3>${product.name}</h3>
    <p>${product.description}</p>
  `;

  resultGrid.innerHTML = [
    {
      label: "支付方式策略",
      title: labelsFor("markets").join("、"),
      body: "根据目标市场组合国际通用方式与本地常用方式。",
      tags: paymentMethods,
    },
    {
      label: "退款处理",
      title: refundRecommendation.title,
      body: refundRecommendation.body,
      tags: refundRecommendation.tags,
    },
    {
      label: "资金处理",
      title: labelsFor("fundModel")[0],
      body: "根据交易资金的最终归属和参与方关系设计资金链路。",
      tags: fundCapabilities,
    },
    {
      label: "运营与财务",
      title: operationCapabilities.length > 1 ? "组合配套能力" : operationCapabilities[0],
      body: "账单、换汇、营销和税务能力可按业务需要叠加。",
      tags: operationCapabilities,
    },
  ]
    .map(
      (card) => `
        <article class="result-card">
          <span>${card.label}</span>
          <h3>${card.title}</h3>
          <p>${card.body}</p>
          <div class="result-tags">${card.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
        </article>
      `,
    )
    .join("");
}

function showResult() {
  state.showingResult = true;
  questionView.hidden = true;
  selectorActions.hidden = true;
  resultView.hidden = false;
  stepLabel.textContent = "选型结果";
  progressLabel.textContent = "已完成";
  buildResults();
  renderProgress();
  restartButtons.forEach((button) => {
    button.hidden = false;
  });
  persistState();
}

function showQuestion(index) {
  const currentQuestions = visibleQuestions();
  state.current = Math.max(0, Math.min(index, currentQuestions.length - 1));
  state.showingResult = false;
  questionView.hidden = false;
  selectorActions.hidden = false;
  resultView.hidden = true;
  restartButtons.forEach((button) => {
    button.hidden = Object.keys(state.answers).length === 0;
  });
  renderQuestion();
  renderProgress();
  renderSnapshot();
  persistState();
}

function restart() {
  state.current = 0;
  state.answers = {};
  state.showingResult = false;
  localStorage.removeItem("pipo-integration-guide");
  showQuestion(0);
}

function persistState() {
  localStorage.setItem(
    "pipo-integration-guide",
    JSON.stringify({
      version: 3,
      current: state.current,
      answers: state.answers,
      showingResult: state.showingResult,
    }),
  );
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem("pipo-integration-guide"));
    if (!saved || typeof saved !== "object" || saved.version !== 3) {
      localStorage.removeItem("pipo-integration-guide");
      return;
    }
    state.current = Number.isInteger(saved.current) ? saved.current : 0;
    state.answers = saved.answers && typeof saved.answers === "object" ? saved.answers : {};
    if (state.answers.paymentScenario === "active") {
      delete state.answers.billingCertainty;
    }
    state.showingResult =
      Boolean(saved.showingResult) && visibleQuestions().every((question) => hasAnswer(question));
  } catch {
    localStorage.removeItem("pipo-integration-guide");
  }
}

nextButton.addEventListener("click", () => {
  const currentQuestions = visibleQuestions();
  if (!hasAnswer(currentQuestions[state.current])) return;
  if (state.current === currentQuestions.length - 1) {
    showResult();
    return;
  }
  showQuestion(state.current + 1);
});

backButton.addEventListener("click", () => showQuestion(state.current - 1));
restartButtons.forEach((button) => button.addEventListener("click", restart));
editAnswers.addEventListener("click", () => showQuestion(0));

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const headerSentinel = document.createElement("span");
headerSentinel.setAttribute("aria-hidden", "true");
headerSentinel.className = "header-sentinel";
document.body.prepend(headerSentinel);

const headerObserver = new IntersectionObserver(
  ([entry]) => header.classList.toggle("scrolled", !entry.isIntersecting),
  { threshold: 0 },
);
headerObserver.observe(headerSentinel);

restoreState();
state.showingResult ? showResult() : showQuestion(state.current);
