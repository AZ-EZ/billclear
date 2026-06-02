(function () {
  const STORAGE_KEY = "billclear:v1";

  const CPT_BENCHMARKS = {
    "99202": { desc: "New patient office visit, low complexity", medicare: 74 },
    "99203": { desc: "New patient office visit, moderate", medicare: 113 },
    "99204": { desc: "New patient office visit, higher complexity", medicare: 169 },
    "99205": { desc: "New patient office visit, high complexity", medicare: 224 },
    "99212": { desc: "Established patient visit, brief", medicare: 57 },
    "99213": { desc: "Established patient visit, moderate", medicare: 92 },
    "99214": { desc: "Established patient visit, detailed", medicare: 131 },
    "99215": { desc: "Established patient visit, comprehensive", medicare: 184 },
    "99281": { desc: "ER visit, minor", medicare: 62 },
    "99282": { desc: "ER visit, low complexity", medicare: 121 },
    "99283": { desc: "ER visit, moderate", medicare: 181 },
    "99284": { desc: "ER visit, high complexity", medicare: 287 },
    "99285": { desc: "ER visit, highest complexity", medicare: 425 },
    "99291": { desc: "Critical care, first 30-74 min", medicare: 282 },
    "99221": { desc: "Initial hospital care, low", medicare: 113 },
    "99222": { desc: "Initial hospital care, moderate", medicare: 153 },
    "99223": { desc: "Initial hospital care, high", medicare: 224 },
    "99231": { desc: "Subsequent hospital care, low", medicare: 56 },
    "99232": { desc: "Subsequent hospital care, moderate", medicare: 102 },
    "99233": { desc: "Subsequent hospital care, high", medicare: 145 },
    "99238": { desc: "Hospital discharge, 30 minutes or less", medicare: 86 },
    "99239": { desc: "Hospital discharge, over 30 minutes", medicare: 127 },
    "36415": { desc: "Blood draw", medicare: 3 },
    "80053": { desc: "Comprehensive metabolic panel", medicare: 14 },
    "80048": { desc: "Basic metabolic panel", medicare: 11 },
    "80061": { desc: "Lipid panel", medicare: 18 },
    "85025": { desc: "Complete blood count with differential", medicare: 10 },
    "85027": { desc: "Complete blood count", medicare: 9 },
    "81001": { desc: "Urinalysis with microscopy", medicare: 4 },
    "83036": { desc: "Hemoglobin A1c", medicare: 13 },
    "84443": { desc: "TSH thyroid screen", medicare: 23 },
    "71045": { desc: "Chest X-ray, single view", medicare: 28 },
    "71046": { desc: "Chest X-ray, two views", medicare: 40 },
    "74177": { desc: "CT abdomen and pelvis with contrast", medicare: 260 },
    "70450": { desc: "CT head or brain without contrast", medicare: 135 },
    "70553": { desc: "MRI brain, with and without contrast", medicare: 400 },
    "72148": { desc: "MRI lumbar spine without contrast", medicare: 240 },
    "93000": { desc: "EKG, complete", medicare: 17 },
    "93306": { desc: "Echocardiogram, complete", medicare: 215 },
    "96360": { desc: "IV hydration, first hour", medicare: 60 },
    "96365": { desc: "IV infusion therapy, first hour", medicare: 73 },
    "96372": { desc: "Therapeutic injection", medicare: 21 },
    "96413": { desc: "Chemotherapy infusion, first hour", medicare: 148 },
    "45378": { desc: "Colonoscopy, diagnostic", medicare: 385 },
    "45380": { desc: "Colonoscopy with biopsy", medicare: 437 },
    "43239": { desc: "Upper GI endoscopy with biopsy", medicare: 365 },
    "27447": { desc: "Total knee replacement", medicare: 1520 },
    "47562": { desc: "Laparoscopic cholecystectomy", medicare: 895 }
  };

  const BUNDLING_FLAGS = [
    {
      codes: ["99213", "96372"],
      label: "Office visit plus injection billed together",
      detail: "An E/M visit plus injection on the same day may need modifier 25 to show a separately identifiable visit.",
      estImpact: 150
    },
    {
      codes: ["99214", "96372"],
      label: "Office visit plus injection billed together",
      detail: "An E/M visit plus injection on the same day may need modifier 25 to show a separately identifiable visit.",
      estImpact: 180
    },
    {
      codes: ["71045", "71046"],
      label: "Two chest X-ray codes on the same date",
      detail: "A single-view and two-view chest X-ray billed together can indicate overlapping billing.",
      estImpact: 80
    },
    {
      codes: ["80048", "80053"],
      label: "Basic and comprehensive metabolic panels both appear",
      detail: "A comprehensive metabolic panel includes many components of the basic panel.",
      estImpact: 45
    },
    {
      codes: ["85027", "85025"],
      label: "CBC with and without differential both appear",
      detail: "A CBC with differential often overlaps with a CBC without differential.",
      estImpact: 35
    }
  ];

  const RED_FLAGS = [
    {
      pattern: /out[- ]of[- ]network|non[- ]participating|non[- ]par\b/i,
      label: "Out-of-network language",
      authority: "No Surprises Act, Public Law 116-260",
      severity: "high",
      estImpact: 1500,
      advice: "If this involved emergency care, an out-of-network clinician at an in-network facility, or air ambulance care, ask the plan and provider to review No Surprises Act protections."
    },
    {
      pattern: /balance bill|balance billing/i,
      label: "Possible balance billing",
      authority: "No Surprises Act consumer protections",
      severity: "high",
      estImpact: 2000,
      advice: "Ask whether the billed amount exceeds your in-network cost sharing for a protected scenario. Request the reason code if they say protections do not apply."
    },
    {
      pattern: /surprise bill/i,
      label: "Surprise bill language",
      authority: "CMS No Surprises Act guidance",
      severity: "high",
      estImpact: 1800,
      advice: "Ask the insurer to reprocess the claim under the No Surprises Act and confirm the in-network cost-sharing amount in writing."
    },
    {
      pattern: /prior[- ]authorization|pre[- ]authorization|authorization (required|denied|missing)/i,
      label: "Prior authorization problem",
      authority: "Plan appeal rights and ERISA Section 503 when applicable",
      severity: "high",
      estImpact: 2500,
      advice: "Ask for the authorization number, the exact policy language, and the documents used to deny or reduce payment."
    },
    {
      pattern: /not medically necessary|medical necessity/i,
      label: "Medical necessity denial",
      authority: "ERISA Section 503 and plan appeal procedures when applicable",
      severity: "high",
      estImpact: 3500,
      advice: "Request the clinical criteria, the reviewer credentials, and all records relied on. Preserve the appeal deadline."
    },
    {
      pattern: /experimental|investigational/i,
      label: "Experimental or investigational denial",
      authority: "Plan appeal rights and external review when available",
      severity: "high",
      estImpact: 4000,
      advice: "Ask for the policy definition, the evidence reviewed, and whether external review is available."
    },
    {
      pattern: /observation (status|stay)/i,
      label: "Observation status",
      authority: "Medicare and hospital status review rules may affect cost sharing",
      severity: "medium",
      estImpact: 1200,
      advice: "Ask whether inpatient status was reviewed and whether the billing status changed your cost sharing."
    },
    {
      pattern: /facility fee/i,
      label: "Facility fee",
      authority: "Hospital price transparency and state disclosure rules may apply",
      severity: "medium",
      estImpact: 400,
      advice: "Ask for the facility-fee policy, the advance disclosure, and whether the visit can be reprocessed at the office-based rate."
    },
    {
      pattern: /appeal.*within (\d+) days|(\d+) days to (file|submit|request) (an )?appeal/i,
      label: "Appeal deadline found",
      authority: "Your plan documents and ERISA timing rules when applicable",
      severity: "deadline",
      estImpact: 0,
      advice: "Put the deadline on a calendar today. Missing it can forfeit appeal rights."
    },
    {
      pattern: /collections|collection agency|credit bureau/i,
      label: "Collections risk",
      authority: "Fair debt collection and hospital billing policies may apply",
      severity: "deadline",
      estImpact: 0,
      advice: "Ask billing to place the account on administrative hold while the dispute is pending, and get the hold in writing."
    }
  ];

  const SAMPLES = {
    caregiver: {
      label: "Mom's ER bill",
      audience: "caregiver",
      docType: "bill",
      nickname: "Mom's ER bill",
      text:
        "Provider statement\nPatient responsibility: $3,642.80\nDate of service: 04/12/2026\n99284 ER visit high complexity $2,250.00\n71045 Chest X-ray single view $340.00\n71046 Chest X-ray two views $415.00\n85025 CBC with differential $185.00\n80053 Comprehensive metabolic panel $240.00\nOut-of-network emergency physician charge $1,950.00\nPlease pay within 30 days."
    },
    crohns: {
      label: "Infusion denial",
      audience: "patient",
      docType: "denial",
      nickname: "Crohn's infusion denial",
      text:
        "Explanation of Benefits\nClaim denied: not medically necessary\nDate of service: 05/03/2026\n96413 Chemotherapy or biologic infusion first hour $2,980.00\n96365 IV infusion therapy first hour $1,220.00\nPrior authorization missing according to plan records.\nYou have 180 days to file an appeal."
    },
    eob: {
      label: "EOB puzzle",
      audience: "patient",
      docType: "eob",
      nickname: "EOB for imaging visit",
      text:
        "Explanation of Benefits\nFacility: In-network hospital outpatient department\nProvider: non-participating radiology group\nPatient responsibility: $1,186.41\n70450 CT head without contrast $1,850.00\n93000 EKG complete $225.00\nBalance billing may apply. Appeal must be submitted within 60 days."
    }
  };

  let state = loadState();
  let toastTimer = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          audience: "caregiver",
          docType: "bill",
          nickname: "",
          text: "",
          cases: [],
          activeCaseId: null,
          currentResult: null
        };
      }
      return {
        audience: "caregiver",
        docType: "bill",
        nickname: "",
        text: "",
        cases: [],
        activeCaseId: null,
        currentResult: null,
        ...JSON.parse(raw)
      };
    } catch (error) {
      return {
        audience: "caregiver",
        docType: "bill",
        nickname: "",
        text: "",
        cases: [],
        activeCaseId: null,
        currentResult: null
      };
    }
  }

  function saveState() {
    const { audience, docType, nickname, text, cases, activeCaseId, currentResult } = state;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ audience, docType, nickname, text, cases, activeCaseId, currentResult })
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function money(value) {
    const amount = Number(value || 0);
    return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function parseAmounts(line) {
    const amounts = [];
    const dollarMatches = line.matchAll(/\$\s*([0-9][0-9,]*(?:\.\d{2})?)/g);
    for (const match of dollarMatches) {
      amounts.push(Number(match[1].replaceAll(",", "")));
    }

    const withoutDollar = line.replace(/\$\s*[0-9][0-9,]*(?:\.\d{2})?/g, " ");
    const decimalMatches = withoutDollar.matchAll(/(?:^|[^\d])([0-9]{1,5}\.\d{2})(?!\d)/g);
    for (const match of decimalMatches) {
      amounts.push(Number(match[1]));
    }

    return amounts.filter((n) => Number.isFinite(n) && n > 0 && n < 1000000);
  }

  function parseLineItems(text) {
    return text
      .split(/\n+/)
      .map((line, idx) => ({ line: line.trim(), idx }))
      .filter((entry) => entry.line.length > 0)
      .map((entry) => {
        const cptMatch = entry.line.match(/(?:^|[^\d])(\d{5})(?!\d)/);
        const amounts = parseAmounts(entry.line);
        return {
          idx: entry.idx,
          raw: entry.line,
          cpt: cptMatch ? cptMatch[1] : null,
          amounts,
          maxAmount: amounts.length ? Math.max(...amounts) : 0
        };
      })
      .filter((item) => item.cpt || item.amounts.length);
  }

  function addFinding(findings, finding) {
    findings.push({
      type: "general",
      confidence: "medium",
      estImpact: 0,
      authority: "",
      detail: "",
      advice: "",
      ...finding
    });
  }

  function runAnalysis(text, docType, audience) {
    const items = parseLineItems(text);
    const findings = [];
    const cptCounts = {};

    items.forEach((item) => {
      if (!item.cpt) return;
      cptCounts[item.cpt] = (cptCounts[item.cpt] || 0) + 1;
      const benchmark = CPT_BENCHMARKS[item.cpt];
      if (!benchmark || !item.maxAmount) return;
      const ratio = item.maxAmount / benchmark.medicare;
      if (ratio >= 4) {
        addFinding(findings, {
          type: "high-charge",
          severity: ratio >= 8 ? "high" : "medium",
          confidence: "high",
          label: `${item.cpt} appears far above a public Medicare benchmark`,
          detail: `${benchmark.desc}: document shows ${money(item.maxAmount)}. BillClear's rough benchmark table shows about ${money(benchmark.medicare)} before local adjustments.`,
          authority: "CMS Physician Fee Schedule benchmark, verify current local rate",
          estImpact: Math.max(0, Math.round(item.maxAmount - benchmark.medicare * 2.5)),
          advice: "Ask for the cash-pay rate, contracted allowed amount, and a coding review for this line."
        });
      }
    });

    Object.entries(cptCounts).forEach(([cpt, count]) => {
      if (count > 1) {
        const benchmark = CPT_BENCHMARKS[cpt];
        addFinding(findings, {
          type: "duplicate",
          severity: "high",
          confidence: "high",
          label: `CPT ${cpt} appears ${count} times`,
          detail: benchmark ? `${benchmark.desc} appears more than once.` : "The same five-digit billing code appears more than once.",
          authority: "Coding review and modifier documentation",
          estImpact: benchmark ? Math.round(benchmark.medicare * 2) : 200,
          advice: "Ask whether each repeat line has a distinct-service modifier such as 59, 76, 77, XE, XS, XP, or XU."
        });
      }
    });

    BUNDLING_FLAGS.forEach((rule) => {
      if (rule.codes.every((code) => cptCounts[code])) {
        addFinding(findings, {
          type: "bundling",
          severity: "medium",
          confidence: "medium",
          label: rule.label,
          detail: rule.detail,
          authority: "NCCI coding edits and payer coding policies",
          estImpact: rule.estImpact,
          advice: "Ask billing or the insurer to review whether these codes should be bundled or require modifiers."
        });
      }
    });

    RED_FLAGS.forEach((rule) => {
      const match = text.match(rule.pattern);
      if (match) {
        addFinding(findings, {
          type: rule.severity === "deadline" ? "deadline" : "keyword",
          severity: rule.severity,
          confidence: "high",
          label: rule.label,
          detail: `Found in document: "${match[0].slice(0, 90)}"`,
          authority: rule.authority,
          estImpact: rule.estImpact,
          advice: rule.advice
        });
      }
    });

    const cptCount = Object.keys(cptCounts).length;
    const hasItemization = cptCount >= 2;
    if (!hasItemization && text.trim().length > 220) {
      addFinding(findings, {
        type: "structural",
        severity: "high",
        confidence: "high",
        label: "No itemized CPT or HCPCS detail found",
        detail: "This looks like a summary statement rather than a fully itemized bill.",
        authority: "Hospital billing and price transparency practices",
        estImpact: 0,
        advice: "Request a fully itemized bill with every code, unit, modifier, and charge before paying."
      });
    }

    if (docType === "denial" && !/180 days|appeal|external review/i.test(text)) {
      addFinding(findings, {
        type: "deadline",
        severity: "deadline",
        confidence: "medium",
        label: "Appeal rights are not obvious",
        detail: "The pasted text does not clearly show the appeal deadline or external review instructions.",
        authority: "Plan appeal rights and ERISA claims procedure rules when applicable",
        estImpact: 0,
        advice: "Ask the plan for the appeal deadline, external review instructions, and the complete denial rationale."
      });
    }

    findings.sort((a, b) => {
      const order = { high: 0, deadline: 1, medium: 2, low: 3 };
      const severityDiff = (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      if (severityDiff) return severityDiff;
      return (b.estImpact || 0) - (a.estImpact || 0);
    });

    const totalCharges = items.reduce((sum, item) => sum + (item.maxAmount || 0), 0);
    const totalAtRisk = findings.reduce((sum, finding) => sum + (finding.estImpact || 0), 0);
    const topFinding = findings[0] || null;

    return {
      items,
      findings,
      summary: {
        cptCount,
        lineItemCount: items.length,
        totalCharges,
        totalAtRisk,
        topFinding,
        docType,
        audience
      }
    };
  }

  function roleLabel(audience) {
    return audience === "caregiver" ? "Caregiver" : "Active-treatment patient";
  }

  function docLabel(docType) {
    if (docType === "eob") return "EOB";
    if (docType === "denial") return "Denial letter";
    return "Provider bill";
  }

  function buildDecode(result) {
    const { summary, findings } = result;
    const audiencePhrase =
      summary.audience === "caregiver"
        ? "You are doing the right thing by slowing the paper down before it becomes a payment plan."
        : "You do not have to solve the billing maze while also handling treatment.";
    if (!findings.length) {
      return `${audiencePhrase} I did not find an obvious automated billing flag in the pasted text. The strongest next move is to request an itemized statement and compare it to your EOB before paying.`;
    }

    const top = findings[0];
    return `${audiencePhrase} The strongest first move is "${top.label}." Start there because it is the issue most likely to change the balance or preserve your appeal rights. Use the script below to ask for the specific code review, policy language, and written hold.`;
  }

  function buildLetter(caseData) {
    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    const isCaregiver = caseData.audience === "caregiver";
    const isDenial = caseData.docType === "denial";
    const highFlags = caseData.findings.filter((finding) => ["high", "deadline"].includes(finding.severity)).slice(0, 5);
    const issueLines = highFlags.length
      ? highFlags.map((finding, index) => `${index + 1}. ${finding.label}. ${finding.detail || finding.advice}`).join("\n")
      : "1. The charges are not clear enough to verify without a fully itemized bill and policy explanation.";
    const authorities = Array.from(
      new Set(caseData.findings.map((finding) => finding.authority).filter(Boolean).slice(0, 5))
    );

    return `${today}

[YOUR NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]
[PHONE]
[EMAIL]

VIA CERTIFIED MAIL AND EMAIL

${isDenial ? "Appeals Department" : "Billing Department"}
[HOSPITAL, PROVIDER, OR INSURANCE COMPANY]
[ADDRESS]

Re: ${isDenial ? "Formal Appeal of Claim Denial" : "Formal Dispute of Medical Charges"}
Patient: [PATIENT NAME]
Account or Claim Number: [ACCOUNT OR CLAIM NUMBER]
Date(s) of Service: [DATE OF SERVICE]
${isCaregiver ? "\nI am acting as the patient's authorized representative. HIPAA authorization or representative documentation is attached or available on request.\n" : ""}
To Whom It May Concern:

I am writing to ${isDenial ? "appeal the denial of the claim referenced above" : "dispute the billed charges referenced above"}. I am requesting a written review before I make payment or before this account is sent to collections.

Specific issues:

${issueLines}

Legal and policy basis:
${authorities.length ? authorities.map((authority) => `- ${authority}`).join("\n") : "- Applicable plan terms, billing policies, and consumer billing protections."}

Please provide the following within 30 calendar days:

1. A fully itemized bill listing every CPT or HCPCS code, modifier, unit, charge, allowed amount, adjustment, and patient responsibility.
2. The plan or billing policy used to calculate the disputed amount.
3. The name and credentials of any reviewer who made a medical-necessity or coding decision.
4. Confirmation that this account is on administrative hold while this dispute is pending.
${isDenial ? "5. Written instructions for internal appeal, external review, and the deadline for each step." : "5. Confirmation of whether No Surprises Act protections, financial assistance, prompt-pay discounts, or cash-pay rates apply."}

Please respond in writing. If the issue is not resolved, I may contact the insurer, the provider's patient advocate, my state insurance department, CMS, the Department of Labor EBSA when applicable, and the state attorney general consumer protection office.

Sincerely,


[YOUR SIGNATURE]
[YOUR PRINTED NAME]

Enclosures:
- Copy of bill, EOB, or denial
- Supporting records
- Authorization form, if applicable`;
  }

  function buildPhoneScript(caseData) {
    const topFlags = caseData.findings.slice(0, 3);
    const issueText = topFlags.length
      ? topFlags.map((finding, index) => `${index + 1}. "${finding.label}"\n   Ask: "${finding.advice}"`).join("\n")
      : "1. Ask for a fully itemized bill with codes, modifiers, units, and allowed amounts.";

    return `Before you call:
- Have the bill, EOB, insurance card, and a blank note page open.
- Write down the date, time, representative name, employee ID, and call reference number.

Opening:
"Hi, I am calling about account or claim [NUMBER] for [PATIENT NAME], date of service [DATE]. I need to dispute or review several items before payment. Can I have your name, employee ID, and a reference number for this call?"

Issues to raise:
${issueText}

Core asks:
- "Please send a fully itemized bill with every CPT or HCPCS code, modifier, unit, charge, allowed amount, adjustment, and patient responsibility."
- "Please place the account on hold for 60 days while this is under review."
- "What is the deadline for a written dispute or appeal?"
- "What document or policy explains this charge or denial?"
- "Can you confirm the next action you are taking and when I should hear back?"

If they push back:
"I understand you may not be able to resolve this on the first call. Please escalate this to a supervisor or coding review team and note that I am sending a written dispute."

Close:
"To confirm, the reference number is [NUMBER], the account is on hold until [DATE], and I should receive [DOCUMENTS] by [DATE]."`;
  }

  function buildTimeline(caseData) {
    const isDenial = caseData.docType === "denial";
    return [
      "Today: copy the top three findings into your notes and call billing or insurance.",
      "Within 24 hours: send the written dispute or appeal by certified mail or secure portal.",
      isDenial
        ? "Within 7 days: request clinical criteria, reviewer credentials, and external review instructions."
        : "Within 7 days: request itemized coding detail, allowed amounts, and No Surprises Act review if relevant.",
      "Every call: write down representative name, employee ID, reference number, and promised next step.",
      "Before any deadline: submit a short appeal even if supporting records are still coming."
    ];
  }

  function buildCommunityQuestion(caseData) {
    const roleLine =
      caseData.audience === "caregiver"
        ? "I am helping a family member review a redacted medical document."
        : "I am in active treatment and reviewing a redacted medical document.";
    const issueLines = caseData.findings.length
      ? caseData.findings
          .slice(0, 3)
          .map((finding) => `- ${finding.label}${finding.authority ? ` (${finding.authority})` : ""}`)
          .join("\n")
      : "- I do not see itemized billing detail yet.";
    const firstAsk = caseData.findings[0]?.advice || "Ask for a fully itemized bill and the appeal or dispute deadline.";

    return `${roleLine}

Document type: ${docLabel(caseData.docType)}

The top things I am checking:
${issueLines}

My first planned ask:
"${firstAsk}"

Before I pay, appeal, or call again, what else should I ask billing or insurance for?

Private details removed: no names, member IDs, claim numbers, addresses, or dates of birth.`;
  }

  function makeCase({ text, docType, audience, nickname }) {
    const analysis = runAnalysis(text, docType, audience);
    const base = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      nickname: nickname.trim() || `${docLabel(docType)} - ${new Date().toLocaleDateString("en-US")}`,
      docType,
      audience,
      rawText: text.trim(),
      findings: analysis.findings,
      summary: analysis.summary,
      status: "open",
      savings: 0
    };
    return {
      ...base,
      decode: buildDecode(base),
      letter: buildLetter(base),
      phoneScript: buildPhoneScript(base),
      timeline: buildTimeline(base),
      communityQuestion: buildCommunityQuestion(base)
    };
  }

  function updateCase(updatedCase) {
    state.cases = state.cases.map((item) => (item.id === updatedCase.id ? updatedCase : item));
    if (state.currentResult && state.currentResult.id === updatedCase.id) {
      state.currentResult = updatedCase;
    }
    saveState();
  }

  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.remove(), 2200);
  }

  function render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <main class="shell">
        <div class="workspace-grid">
          <section>
            ${state.currentResult ? renderResults(state.currentResult) : renderDecoder()}
          </section>
          <aside class="rail">
            ${renderVisualPanel()}
            ${renderCasePanel()}
            ${renderReferencePanel()}
          </aside>
        </div>
      </main>
    `;
    requestAnimationFrame(drawPaperworkCanvas);
  }

  function renderDecoder() {
    return `
      <div class="panel">
        <div class="eyebrow"><span class="dot"></span>For caregivers and active-treatment patients</div>
        <h1>Find your next move on one medical bill.</h1>
        <p class="lead">Paste redacted text from an EOB, denial letter, or itemized bill. BillClear shows the strongest thing to question and drafts the words to use.</p>

        <div class="trust-row" aria-label="Trust notes">
          <span class="trust-chip">No upload</span>
          <span class="trust-chip">Redact first</span>
          <span class="trust-chip">Saved in this browser</span>
        </div>

        <ol class="mini-steps" aria-label="BillClear steps">
          <li><strong>Paste</strong><span>Use one document, not the whole stack.</span></li>
          <li><strong>Review</strong><span>Start with the highest-leverage issue.</span></li>
          <li><strong>Send</strong><span>Copy the script or dispute letter.</span></li>
        </ol>

        <div class="split">
          <div>
            <label class="field-label fineprint">Who are you helping?</label>
            <div class="segmented" aria-label="Audience">
              <button type="button" class="segment-btn ${state.audience === "caregiver" ? "active" : ""}" data-action="set-audience" data-value="caregiver">Caregiver</button>
              <button type="button" class="segment-btn ${state.audience === "patient" ? "active" : ""}" data-action="set-audience" data-value="patient">Active-treatment patient</button>
            </div>
          </div>
          <div>
            <label class="field-label fineprint">What are you looking at?</label>
            <div class="doc-buttons" aria-label="Document type">
              <button type="button" class="doc-btn ${state.docType === "bill" ? "active" : ""}" data-action="set-doc" data-value="bill">Bill</button>
              <button type="button" class="doc-btn ${state.docType === "eob" ? "active" : ""}" data-action="set-doc" data-value="eob">EOB</button>
              <button type="button" class="doc-btn ${state.docType === "denial" ? "active" : ""}" data-action="set-doc" data-value="denial">Denial</button>
            </div>
          </div>
        </div>

        <form id="analyzeForm">
          <div class="field">
            <label for="caseNickname">Case nickname</label>
            <input class="input" id="caseNickname" name="nickname" value="${escapeHtml(state.nickname)}" placeholder="Example: Dad's ER bill or March infusion denial">
          </div>
          <div class="field">
            <label for="billText">Paste the paperwork text</label>
            <textarea class="textarea" id="billText" name="billText" placeholder="Remove names, addresses, member IDs, claim numbers, and dates of birth first. Then paste the line items, denial reason, EOB text, and deadline language.">${escapeHtml(state.text)}</textarea>
          </div>
          <div class="actions">
            <button class="primary-btn" type="submit">Find my next move</button>
            <button class="secondary-btn" type="button" data-action="clear-draft">Clear</button>
          </div>
        </form>
        <p class="fineprint">Local-only launch version. For photos or PDFs, use your portal's copy-text feature, OCR, or ask the provider for an itemized PDF you can copy from.</p>
      </div>

      <div class="panel no-print">
        <div class="split">
          <div>
            <h2>Try a launch scenario</h2>
            <p class="fineprint">These samples mirror the first two communities to interview: caregivers managing a parent's paperwork and active-treatment patients managing recurring EOBs.</p>
          </div>
          <div class="actions">
            <button class="small-btn" type="button" data-action="load-sample" data-value="caregiver">Caregiver ER bill</button>
            <button class="small-btn" type="button" data-action="load-sample" data-value="crohns">Infusion denial</button>
            <button class="small-btn" type="button" data-action="load-sample" data-value="eob">EOB puzzle</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderResults(caseData) {
    const totalAtRisk = caseData.summary.totalAtRisk || 0;
    const findings = caseData.findings || [];
    const top = findings[0];
    return `
      <div class="panel">
        <div class="split">
          <div>
            <div class="eyebrow"><span class="dot"></span>${escapeHtml(roleLabel(caseData.audience))} packet</div>
            <h1>${escapeHtml(caseData.nickname)}</h1>
            <p class="lead">${escapeHtml(caseData.decode)}</p>
          </div>
          <div class="actions">
            <button class="secondary-btn" type="button" data-action="new-analysis">New document</button>
            <button class="secondary-btn" type="button" data-action="print">Print</button>
          </div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <div class="metric-label">Estimated review target</div>
            <div class="metric-value">${money(totalAtRisk)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Findings</div>
            <div class="metric-value">${findings.length}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Codes found</div>
            <div class="metric-value">${caseData.summary.cptCount}</div>
          </div>
        </div>

        ${
          top
            ? `<div class="finding-card ${top.severity}">
                <div class="badge-row">
                  <span class="badge ${top.severity}">${escapeHtml(top.severity)}</span>
                  ${top.estImpact ? `<span class="badge neutral">${money(top.estImpact)} estimate</span>` : ""}
                </div>
                <h2>${escapeHtml(top.label)}</h2>
                <p>${escapeHtml(top.detail || top.advice)}</p>
                <p class="fineprint"><strong>Ask for:</strong> ${escapeHtml(top.advice)}</p>
                ${top.authority ? `<p class="fineprint"><strong>Reference:</strong> ${escapeHtml(top.authority)}</p>` : ""}
              </div>`
            : `<div class="empty-state">No automated billing flags appeared in the pasted text. The next move is still useful: request a fully itemized bill and compare it to your EOB before paying.</div>`
        }
      </div>

      ${
        findings.length
          ? `<div class="panel">
              <h2>Challengeable findings</h2>
              <div class="findings-list">
                ${findings.map(renderFinding).join("")}
              </div>
            </div>`
          : ""
      }

      <div class="panel">
        <div class="split">
          <div>
            <h2>Dispute letter draft</h2>
            <p class="fineprint">Edit placeholders before sending. Certified mail plus portal upload is the strongest paper trail.</p>
          </div>
          <div class="actions">
            <button class="small-btn" type="button" data-action="copy-letter">Copy letter</button>
            <a class="primary-btn compact-btn" href="mailto:beta@billclear.app?subject=BillClear%20$39%20packet%20review&body=I%20want%20a%20paid%20review%20for%20my%20BillClear%20packet.%20Please%20send%20intake%20steps.">Get $39 packet review</a>
          </div>
        </div>
        <div class="review-note">
          <strong>Beta review:</strong> 48-hour cleanup for one redacted document. If the paid review cannot make the packet more specific than this draft, do not pay.
        </div>
        <textarea id="letterOutput" class="letter-box">${escapeHtml(caseData.letter)}</textarea>
      </div>

      <div class="panel">
        <div class="split">
          <div>
            <h2>Phone script</h2>
            <p class="fineprint">Use this before mailing so the written dispute references a live call and a reference number.</p>
          </div>
          <div class="actions">
            <button class="small-btn" type="button" data-action="copy-script">Copy script</button>
          </div>
        </div>
        <textarea id="scriptOutput" class="letter-box">${escapeHtml(caseData.phoneScript)}</textarea>
      </div>

      <div class="panel">
        <div class="split">
          <div>
            <h2>Community-safe question</h2>
            <p class="fineprint">For a caregiver group, chronic-illness forum, or trusted nurse friend. It removes private details and asks for the next thing to check.</p>
          </div>
          <div class="actions">
            <button class="small-btn" type="button" data-action="copy-community">Copy question</button>
          </div>
        </div>
        <textarea id="communityOutput" class="letter-box community-box">${escapeHtml(caseData.communityQuestion || buildCommunityQuestion(caseData))}</textarea>
      </div>

      <div class="panel">
        <h2>Follow-up plan</h2>
        <ul class="check-list">
          ${caseData.timeline.map((item) => `<li><span class="check-icon">&#10003;</span><span>${escapeHtml(item)}</span></li>`).join("")}
        </ul>
        <div class="actions">
          <label class="fineprint" for="statusSelect">Status</label>
          <select class="select" id="statusSelect" data-action="status-change">
            ${["open", "called", "mailed", "resolved"].map((status) => `<option value="${status}" ${caseData.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </div>
      </div>
    `;
  }

  function renderFinding(finding) {
    return `
      <div class="finding-card ${escapeHtml(finding.severity)}">
        <div class="badge-row">
          <span class="badge ${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span>
          ${finding.estImpact ? `<span class="badge neutral">${money(finding.estImpact)} estimate</span>` : ""}
          <span class="badge neutral">${escapeHtml(finding.confidence)} confidence</span>
        </div>
        <h3>${escapeHtml(finding.label)}</h3>
        ${finding.detail ? `<p>${escapeHtml(finding.detail)}</p>` : ""}
        <p class="fineprint">${escapeHtml(finding.advice)}</p>
        ${finding.authority ? `<p class="fineprint"><strong>Reference:</strong> ${escapeHtml(finding.authority)}</p>` : ""}
      </div>
    `;
  }

  function renderVisualPanel() {
    return `
      <section class="panel visual-panel" aria-label="BillClear document preview">
        <div class="visual-header">
          <div class="eyebrow"><span class="dot"></span>Paperwork triage</div>
          <h2>One stack at a time</h2>
          <p class="fineprint">The launch workflow is intentionally narrow: paste one document, identify one best challenge, send one packet.</p>
        </div>
        <canvas id="paperworkCanvas" class="paperwork-canvas" width="640" height="480" role="img" aria-label="Illustration of medical bills, EOBs, and a dispute letter moving through a review stack"></canvas>
      </section>
      <section class="panel">
        <h2>What the packet includes</h2>
        <ul class="check-list">
          <li><span class="check-icon">&#10003;</span><span>Plain-English readout for a caregiver or active-treatment patient.</span></li>
          <li><span class="check-icon">&#10003;</span><span>Red flags for surprise billing, denials, duplicates, and unusual code charges.</span></li>
          <li><span class="check-icon">&#10003;</span><span>Editable dispute letter, phone script, follow-up timeline, and community-safe question.</span></li>
        </ul>
      </section>
    `;
  }

  function renderCasePanel() {
    const cases = state.cases || [];
    const totalAtRisk = cases.reduce((sum, item) => sum + (item.summary?.totalAtRisk || 0), 0);
    return `
      <section class="panel" id="casesPanel">
        <div class="split">
          <div>
            <h2>Saved cases</h2>
            <p class="fineprint">${cases.length} local case${cases.length === 1 ? "" : "s"}${totalAtRisk ? `, ${money(totalAtRisk)} worth challenging` : ""}.</p>
          </div>
          ${cases.length ? `<button class="small-btn" type="button" data-action="export-cases">Export</button>` : ""}
        </div>
        ${
          cases.length
            ? `<div class="case-list">
                ${cases.map(renderCaseRow).join("")}
              </div>`
            : `<div class="empty-state">Analyze a document and it will be saved here in this browser.</div>`
        }
      </section>
    `;
  }

  function renderCaseRow(caseData) {
    return `
      <button type="button" class="case-row" data-action="open-case" data-id="${escapeHtml(caseData.id)}">
        <span class="case-title">${escapeHtml(caseData.nickname)}</span>
        <span class="case-meta">${escapeHtml(docLabel(caseData.docType))} | ${escapeHtml(caseData.status)} | ${formatDate(caseData.createdAt)} | ${money(caseData.summary?.totalAtRisk || 0)}</span>
      </button>
    `;
  }

  function renderReferencePanel() {
    return `
      <section class="panel">
        <h2>Guardrails</h2>
        <p class="fineprint">Educational tool only. Verify codes, deadlines, and plan rules before sending. For complex or urgent disputes, contact a certified medical billing advocate, patient advocate, attorney, or your insurer.</p>
        <div class="source-links">
          <a href="https://www.cms.gov/medical-bill-rights/know-your-rights" target="_blank" rel="noreferrer">CMS rights</a>
          <a href="https://www.cms.gov/medicare/physician-fee-schedule/search/overview" target="_blank" rel="noreferrer">CMS PFS</a>
          <a href="https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/publications/group-health-and-disability-plans-benefit-claims-procedure-regulation" target="_blank" rel="noreferrer">DOL appeals</a>
        </div>
      </section>
    `;
  }

  function drawPaperworkCanvas() {
    const canvas = document.getElementById("paperworkCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#edf3f7";
    ctx.fillRect(0, 0, w, h);

    drawDoc(ctx, w * 0.09, h * 0.18, w * 0.55, h * 0.66, -5, "#ffffff", "#3159a8", "EOB", ["Allowed amount", "Patient responsibility", "Appeal within 60 days"]);
    drawDoc(ctx, w * 0.28, h * 0.1, w * 0.55, h * 0.66, 4, "#ffffff", "#d95d39", "BILL", ["99284 ER visit", "$2,250.00", "Out-of-network"]);
    drawDoc(ctx, w * 0.17, h * 0.33, w * 0.6, h * 0.56, 0, "#ffffff", "#087a7a", "DISPUTE", ["Request itemized bill", "Coding review", "Account on hold"]);

    ctx.fillStyle = "#17202a";
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    ctx.fillText("Paste -> decode -> dispute packet", w * 0.12, h * 0.92);
  }

  function drawDoc(ctx, x, y, width, height, rotate, fill, accent, title, lines) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);
    ctx.shadowColor = "rgba(23, 32, 42, 0.16)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = fill;
    roundRect(ctx, 0, 0, width, height, 12);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#d9e0e8";
    ctx.lineWidth = 1;
    roundRect(ctx, 0, 0, width, height, 12);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, width, 9);
    ctx.fillStyle = "#17202a";
    ctx.font = "800 16px Inter, system-ui, sans-serif";
    ctx.fillText(title, 22, 42);
    ctx.strokeStyle = "#d9e0e8";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(22, 68 + i * 28);
      ctx.lineTo(width - 22, 68 + i * 28);
      ctx.stroke();
    }
    ctx.font = "700 13px Inter, system-ui, sans-serif";
    lines.forEach((line, index) => {
      ctx.fillStyle = index === lines.length - 1 ? accent : "#5b6472";
      ctx.fillText(line, 22, 90 + index * 38);
    });
    ctx.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function handleAnalyze(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const text = String(form.get("billText") || "").trim();
    const nickname = String(form.get("nickname") || "").trim();
    if (text.length < 30) {
      showToast("Paste at least a few lines from the bill, EOB, or denial.");
      return;
    }
    const newCase = makeCase({ text, docType: state.docType, audience: state.audience, nickname });
    state.text = text;
    state.nickname = nickname;
    state.cases = [newCase, ...state.cases.filter((item) => item.id !== newCase.id)];
    state.currentResult = newCase;
    state.activeCaseId = newCase.id;
    saveState();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyTextFrom(id, label) {
    const node = document.getElementById(id);
    if (!node) return;
    await navigator.clipboard.writeText(node.value || node.textContent || "");
    showToast(`${label} copied`);
  }

  function exportCases() {
    const payload = JSON.stringify(state.cases, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billclear-cases.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener("submit", (event) => {
    if (event.target.id === "analyzeForm") handleAnalyze(event);
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "billText") {
      state.text = event.target.value;
      saveState();
    }
    if (event.target.id === "caseNickname") {
      state.nickname = event.target.value;
      saveState();
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.dataset.action === "status-change" && state.currentResult) {
      const updated = { ...state.currentResult, status: event.target.value };
      updateCase(updated);
      showToast("Status saved locally");
      render();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "set-audience") {
      state.audience = target.dataset.value;
      saveState();
      render();
    }

    if (action === "set-doc") {
      state.docType = target.dataset.value;
      saveState();
      render();
    }

    if (action === "clear-draft") {
      state.text = "";
      state.nickname = "";
      saveState();
      render();
    }

    if (action === "load-sample") {
      const sample = SAMPLES[target.dataset.value];
      state.audience = sample.audience;
      state.docType = sample.docType;
      state.nickname = sample.nickname;
      state.text = sample.text;
      state.currentResult = null;
      saveState();
      render();
      showToast(`${sample.label} loaded`);
    }

    if (action === "new-analysis") {
      state.currentResult = null;
      state.activeCaseId = null;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "focus-cases") {
      const casesPanel = document.getElementById("casesPanel");
      if (casesPanel) casesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (action === "open-case") {
      const caseData = state.cases.find((item) => item.id === target.dataset.id);
      if (caseData) {
        state.currentResult = caseData;
        state.activeCaseId = caseData.id;
        saveState();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    if (action === "copy-letter") copyTextFrom("letterOutput", "Letter");
    if (action === "copy-script") copyTextFrom("scriptOutput", "Script");
    if (action === "copy-community") copyTextFrom("communityOutput", "Question");
    if (action === "print") window.print();
    if (action === "export-cases") exportCases();
  });

  window.addEventListener("resize", () => requestAnimationFrame(drawPaperworkCanvas));

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

  render();
})();
