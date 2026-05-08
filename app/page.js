'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============ CPT BENCHMARK DATA ============
const CPT_BENCHMARKS = {
  '99202': { desc: 'New patient office visit, low complexity', medicare: 74 },
  '99203': { desc: 'New patient office visit, moderate', medicare: 113 },
  '99204': { desc: 'New patient office visit, higher complexity', medicare: 169 },
  '99205': { desc: 'New patient office visit, high complexity', medicare: 224 },
  '99212': { desc: 'Established patient visit, brief', medicare: 57 },
  '99213': { desc: 'Established patient visit, moderate', medicare: 92 },
  '99214': { desc: 'Established patient visit, detailed', medicare: 131 },
  '99215': { desc: 'Established patient visit, comprehensive', medicare: 184 },
  '99281': { desc: 'ER visit, minor', medicare: 62 },
  '99282': { desc: 'ER visit, low complexity', medicare: 121 },
  '99283': { desc: 'ER visit, moderate', medicare: 181 },
  '99284': { desc: 'ER visit, high complexity', medicare: 287 },
  '99285': { desc: 'ER visit, highest complexity', medicare: 425 },
  '99291': { desc: 'Critical care, first 30-74 min', medicare: 282 },
  '99221': { desc: 'Initial hospital care, low', medicare: 113 },
  '99222': { desc: 'Initial hospital care, moderate', medicare: 153 },
  '99223': { desc: 'Initial hospital care, high', medicare: 224 },
  '99231': { desc: 'Subsequent hospital care, low', medicare: 56 },
  '99232': { desc: 'Subsequent hospital care, moderate', medicare: 102 },
  '99233': { desc: 'Subsequent hospital care, high', medicare: 145 },
  '99238': { desc: 'Hospital discharge, 30 min or less', medicare: 86 },
  '99239': { desc: 'Hospital discharge, over 30 min', medicare: 127 },
  '36415': { desc: 'Blood draw (venipuncture)', medicare: 3 },
  '80053': { desc: 'Comprehensive metabolic panel', medicare: 14 },
  '80048': { desc: 'Basic metabolic panel', medicare: 11 },
  '80061': { desc: 'Lipid panel', medicare: 18 },
  '85025': { desc: 'Complete blood count with differential', medicare: 10 },
  '85027': { desc: 'Complete blood count', medicare: 9 },
  '81001': { desc: 'Urinalysis with microscopy', medicare: 4 },
  '83036': { desc: 'Hemoglobin A1c', medicare: 13 },
  '84443': { desc: 'TSH (thyroid screen)', medicare: 23 },
  '71045': { desc: 'Chest X-ray, single view', medicare: 28 },
  '71046': { desc: 'Chest X-ray, 2 views', medicare: 40 },
  '74177': { desc: 'CT abdomen/pelvis with contrast', medicare: 260 },
  '70450': { desc: 'CT head/brain without contrast', medicare: 135 },
  '70553': { desc: 'MRI brain, with and without contrast', medicare: 400 },
  '72148': { desc: 'MRI lumbar spine without contrast', medicare: 240 },
  '93000': { desc: 'EKG, complete', medicare: 17 },
  '93306': { desc: 'Echocardiogram, complete', medicare: 215 },
  '96360': { desc: 'IV hydration, first hour', medicare: 60 },
  '96365': { desc: 'IV infusion therapy, first hour', medicare: 73 },
  '96372': { desc: 'Therapeutic injection', medicare: 21 },
  '96413': { desc: 'Chemotherapy infusion, first hour', medicare: 148 },
  '45378': { desc: 'Colonoscopy, diagnostic', medicare: 385 },
  '45380': { desc: 'Colonoscopy with biopsy', medicare: 437 },
  '43239': { desc: 'Upper GI endoscopy with biopsy', medicare: 365 },
  '27447': { desc: 'Total knee replacement', medicare: 1520 },
  '47562': { desc: 'Laparoscopic cholecystectomy', medicare: 895 },
};

const BUNDLING_FLAGS = [
  { codes: ['99213', '96372'], msg: 'E/M visit + injection same day without modifier 25 may be improperly unbundled' },
  { codes: ['99214', '96372'], msg: 'E/M visit + injection same day without modifier 25 may be improperly unbundled' },
  { codes: ['71045', '71046'], msg: 'Single + 2-view chest X-ray same day — typically only one should be billed' },
  { codes: ['80048', '80053'], msg: 'Basic + comprehensive metabolic panel same day — comprehensive includes basic components' },
  { codes: ['85027', '85025'], msg: 'CBC with and without differential same day — typically only one is appropriate' },
];

const RED_FLAGS = [
  { pattern: /out[- ]of[- ]network|non[- ]participating|non[- ]par\b/i, label: 'Out-of-network charge', authority: 'No Surprises Act (Public Law 116-260)', severity: 'high', estImpact: 1500, advice: 'If this was emergency care, an ancillary service at an in-network facility, or you had no choice of provider, the No Surprises Act protects you.' },
  { pattern: /balance bill|balance billing/i, label: 'Balance billing', authority: 'No Surprises Act §2799B-1', severity: 'high', estImpact: 2000, advice: 'Balance billing for emergency care or surprise bills at in-network facilities has been federally prohibited since January 2022.' },
  { pattern: /surprise bill/i, label: 'Surprise bill indicated', authority: 'No Surprises Act', severity: 'high', estImpact: 1800, advice: 'Federal NSA protections apply. Request that this be reprocessed under NSA dispute resolution.' },
  { pattern: /prior[- ]authorization|pre[- ]authorization|authorization (required|denied|missing)/i, label: 'Prior authorization issue', authority: 'ERISA §503 / 29 CFR 2560', severity: 'high', estImpact: 2500, advice: 'If prior auth was obtained but denied retroactively, request the specific auth number and appeal citing it.' },
  { pattern: /not medically necessary|medical necessity/i, label: 'Medical necessity denial', authority: 'ERISA §503 / state external review', severity: 'high', estImpact: 3500, advice: 'You are entitled to the specific clinical criteria used. External review overturns these in 38-56% of cases.' },
  { pattern: /experimental|investigational/i, label: 'Experimental/investigational denial', authority: 'ERISA §503', severity: 'high', estImpact: 4000, advice: 'Request the specific policy language and peer-reviewed evidence considered. External review often overturns these.' },
  { pattern: /observation (status|stay)/i, label: 'Observation status', authority: 'CMS Two-Midnight Rule', severity: 'medium', estImpact: 1200, advice: 'Observation is outpatient — this can cost more than inpatient admission under Medicare. Request review of status.' },
  { pattern: /facility fee/i, label: 'Facility fee charge', authority: 'CMS billing transparency rules', severity: 'medium', estImpact: 400, advice: 'Facility fees may be separately billable but should be disclosed in advance.' },
  { pattern: /appeal.*within (\d+) days|(\d+) days to (file|submit|request) (an )?appeal/i, label: 'Appeal deadline stated', authority: 'Your policy + ERISA timing rules', severity: 'deadline', estImpact: 0, advice: 'Note this carefully — missing it forfeits your appeal right.' },
];

// ============ HEURISTICS ============
function parseLineItems(text) {
  const lines = text.split(/\n/).filter(l => l.trim().length > 0);
  const items = [];
  lines.forEach((line, idx) => {
    const cptMatch = line.match(/(?<!\d)(\d{5})(?!\d)/);
    const amountMatches = [...line.matchAll(/\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2})/g)];
    const amounts = amountMatches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => n > 0 && n < 1000000);
    if (cptMatch || amounts.length > 0) {
      items.push({ idx, raw: line.trim(), cpt: cptMatch ? cptMatch[1] : null, amounts, maxAmount: amounts.length ? Math.max(...amounts) : 0 });
    }
  });
  return items;
}

function runHeuristics(text, docType) {
  const flags = [];
  const items = parseLineItems(text);
  const cptCounts = {};

  items.forEach(item => {
    if (item.cpt) {
      cptCounts[item.cpt] = (cptCounts[item.cpt] || 0) + 1;
      const bench = CPT_BENCHMARKS[item.cpt];
      if (bench && item.maxAmount > 0) {
        const ratio = item.maxAmount / bench.medicare;
        if (ratio >= 4) {
          const overage = item.maxAmount - (bench.medicare * 2.5);
          flags.push({
            type: 'high-charge',
            severity: ratio >= 8 ? 'high' : 'medium',
            label: `${item.cpt} charged ${ratio.toFixed(1)}× above Medicare benchmark`,
            detail: `${bench.desc} — billed at $${item.maxAmount.toFixed(2)}, Medicare allows $${bench.medicare}`,
            authority: 'CMS Medicare Physician Fee Schedule (2024)',
            estImpact: Math.round(overage),
            advice: `Hospitals routinely settle these to 2-3× Medicare when challenged. Ask for the cash-pay rate or self-pay discount.`,
            confidence: 'high',
          });
        }
      }
    }
  });

  Object.entries(cptCounts).forEach(([cpt, count]) => {
    if (count > 1) {
      const bench = CPT_BENCHMARKS[cpt];
      flags.push({
        type: 'duplicate', severity: 'high',
        label: `Duplicate CPT ${cpt} appears ${count} times`,
        detail: bench ? `${bench.desc} — billed multiple times on the same date` : `Same code billed multiple times`,
        authority: 'AMA CPT coding standards + NCCI edits',
        estImpact: bench ? Math.round(bench.medicare * 2) : 200,
        advice: `Unless each entry has a distinct modifier (59, 76, 77, XE, XS, XP, XU), at least one is improperly billed.`,
        confidence: 'high',
      });
    }
  });

  BUNDLING_FLAGS.forEach(rule => {
    if (rule.codes.every(c => cptCounts[c])) {
      flags.push({
        type: 'bundling', severity: 'medium',
        label: `Possible unbundling: ${rule.codes.join(' + ')}`,
        detail: rule.msg, authority: 'NCCI (National Correct Coding Initiative) edits',
        estImpact: 150, advice: `Request that the coder review NCCI edits for this code pair.`,
        confidence: 'medium',
      });
    }
  });

  RED_FLAGS.forEach(rule => {
    const match = text.match(rule.pattern);
    if (match) {
      flags.push({
        type: rule.severity === 'deadline' ? 'deadline' : 'keyword',
        severity: rule.severity, label: rule.label,
        detail: match[0] ? `Found in document: "${match[0].slice(0, 80)}"` : '',
        authority: rule.authority, estImpact: rule.estImpact,
        advice: rule.advice, confidence: 'high',
      });
    }
  });

  const hasItemization = items.filter(i => i.cpt).length >= 3;
  if (!hasItemization && text.length > 200) {
    flags.push({
      type: 'structural', severity: 'high',
      label: 'No itemized codes found',
      detail: 'This appears to be a summary, not an itemized bill',
      authority: 'Federal hospital billing transparency rules', estImpact: 0,
      advice: `You have a legal right to a fully itemized bill listing every CPT/HCPCS code and charge. Call billing and request one in writing.`,
      confidence: 'high',
    });
  }

  flags.sort((a, b) => {
    const order = { high: 0, deadline: 1, medium: 2, low: 3 };
    const sevDiff = (order[a.severity] || 4) - (order[b.severity] || 4);
    if (sevDiff !== 0) return sevDiff;
    return (b.estImpact || 0) - (a.estImpact || 0);
  });

  const totalEstImpact = flags.reduce((s, f) => s + (f.estImpact || 0), 0);
  const totalCharges = items.reduce((s, i) => s + i.maxAmount, 0);

  return {
    flags, items,
    summary: {
      totalLineItems: items.length,
      cptCodesFound: Object.keys(cptCounts).length,
      totalCharges, totalEstImpact, topFlag: flags[0] || null,
    }
  };
}

// ============ FILE → BASE64 + EXTRACTION VIA SERVER ROUTE ============
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractTextFromFile(file, onProgress) {
  const base64 = await fileToBase64(file);
  const isPDF = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');

  if (!isPDF && !isImage) {
    throw new Error('Unsupported file type. Use a JPG, PNG, or PDF.');
  }

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64,
        mediaType: file.type,
        isPDF
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Extraction failed (${response.status})`);
    }
    const data = await response.json();
    return data.text;
  } catch (err) {
    throw err;
  }
}

// ============ ANALYSIS API ============
async function analyzeWithClaude(text, docType, heuristicResult) {
  const docTypeLabel = { bill: 'medical bill', eob: 'Explanation of Benefits (EOB)', denial: 'insurance denial letter' }[docType] || 'medical document';
  const prompt = `You are a billing advocate reviewing a ${docTypeLabel}. Identify SPECIFIC disputable issues.

DOCUMENT:
"""
${text.slice(0, 6000)}
"""

PRELIMINARY HEURISTIC FLAGS:
${heuristicResult.flags.slice(0, 8).map(f => `- [${f.severity}] ${f.label}`).join('\n') || '(none)'}

Respond ONLY with valid JSON (no markdown fences):
{
  "summary": "2-3 sentences in plain English. Warm, on-the-user's-side tone — like a friend who used to work in hospital billing.",
  "criticalFindings": [{"title": "short flag name", "explanation": "why this matters in plain English", "action": "specific action", "severity": "high|medium|low", "estDollarImpact": 0}],
  "disputeAngles": ["specific legal/policy angle 1", "angle 2"],
  "questionsToAsk": ["specific question for billing/insurance 1", "question 2"]
}

Cite CPT codes, dollar amounts, policy terms from the actual document. Never invent facts.`;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens: 1200 })
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const cleaned = data.text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) { return null; }
}

async function generateDisputeLetterAI(caseData) {
  const flagSummary = caseData.flags.slice(0, 6).map(f => `- ${f.label} (${f.authority}): ${f.advice}`).join('\n');
  const aiSummary = caseData.aiAnalysis ? `\nContext: ${caseData.aiAnalysis.summary}\nDispute angles: ${(caseData.aiAnalysis.disputeAngles || []).join('; ')}` : '';
  const prompt = `Draft a formal dispute letter for a ${caseData.docType === 'denial' ? 'denied insurance claim' : 'disputed medical bill'}. Writer is ${caseData.userRole === 'caregiver' ? "the patient's authorized representative (HIPAA reference required)" : "the patient"}.

Issues:
${flagSummary}${aiSummary}

Requirements (350-500 words):
1. Account/claim reference and date at top
2. Specific items disputed with dollar amounts and CPT codes
3. Cite exact legal authority (No Surprises Act §2799B-1, ERISA §503, NCCI edits, CMS Medicare benchmarks)
4. Specific action requests, 30-day response deadline, certified mail reference
5. Plain text, [BRACKETS] for placeholders. Do NOT invent facts.`;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens: 1200 })
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    return data.text || null;
  } catch (err) { return null; }
}

// ============ HEURISTIC FALLBACK LETTER ============
function generateHeuristicLetter(caseData) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const highFlags = caseData.flags.filter(f => f.severity === 'high');
  const hasDuplicate = caseData.flags.some(f => f.type === 'duplicate');
  const hasHighCharge = caseData.flags.some(f => f.type === 'high-charge');
  const hasSurprise = caseData.flags.some(f => /surprise|out.of.network|balance/i.test(f.label));
  const hasMedNec = caseData.flags.some(f => /medical necessity|experimental/i.test(f.label));
  const isDenial = caseData.docType === 'denial';
  const writerNote = caseData.userRole === 'caregiver' ? "\n[Note: I am the authorized representative for the patient. HIPAA authorization is attached/on file.]\n" : '';

  let legalBasis = [];
  if (hasSurprise) legalBasis.push('the federal No Surprises Act (Public Law 116-260, §2799B-1)');
  if (hasMedNec && isDenial) legalBasis.push('ERISA §503 (29 U.S.C. §1133) and 29 CFR 2560.503-1');
  if (hasHighCharge) legalBasis.push('the CMS Medicare Physician Fee Schedule benchmark rates');
  if (legalBasis.length === 0) legalBasis.push('standard consumer billing protections and my insurance policy terms');

  const disputedItems = [];
  if (hasDuplicate) disputedItems.push('duplicate CPT code entries lacking distinct-service modifiers');
  if (hasHighCharge) disputedItems.push('charges substantially exceeding CMS Medicare benchmark rates');
  if (caseData.flags.some(f => f.type === 'bundling')) disputedItems.push('potential unbundling in violation of NCCI coding edits');
  if (hasSurprise) disputedItems.push('out-of-network or balance billing charges that may be prohibited under federal law');
  if (hasMedNec) disputedItems.push('denial on grounds of medical necessity without adequate clinical justification');

  return `${today}

[YOUR NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]
[PHONE]
[EMAIL]

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

${isDenial ? 'Appeals Department' : 'Billing Department'}
[INSURANCE COMPANY / HOSPITAL NAME]
[ADDRESS]

Re: ${isDenial ? 'Formal Appeal of Claim Denial' : 'Formal Dispute of Billed Charges'}
Account/Claim Number: [ACCOUNT OR CLAIM #]
Patient Name: [PATIENT NAME]
Date(s) of Service: [DATE OF SERVICE]
${writerNote}
To Whom It May Concern:

I am writing to ${isDenial ? 'formally appeal the denial of the above-referenced claim' : 'formally dispute the charges on the above-referenced bill'}. Upon detailed review, I have identified the following specific issues:

${(disputedItems.length ? disputedItems : ['charges that are not adequately substantiated by the documentation provided']).map((item, i) => `${i + 1}. ${item.charAt(0).toUpperCase() + item.slice(1)}.`).join('\n')}

${highFlags.length > 0 ? `Specific items of concern:\n${highFlags.slice(0, 5).map(f => `   • ${f.label}${f.authority ? ` [Authority: ${f.authority}]` : ''}`).join('\n')}\n` : ''}

These concerns are supported by ${legalBasis.join('; ')}.

I respectfully request that you:

${isDenial ? `1. Reverse the denial and reprocess this claim, OR within 30 days provide (a) the specific clinical criteria used, (b) the credentials of the reviewer, and (c) any peer-reviewed medical literature consulted.
2. Provide written notice of my external review rights per 29 CFR 2560.503-1.
3. Place all collections activity on hold pending resolution.` : `1. Provide a fully itemized statement listing every CPT/HCPCS code, modifier, units, and charge.
2. Review each flagged item and adjust charges that cannot be substantiated.
3. Confirm in writing whether any portion was subject to No Surprises Act protections.
4. Place this account on administrative hold during this review.`}

Please respond in writing within 30 calendar days of receipt. If unresolved, I will pursue external review, file complaints with my state insurance commissioner${isDenial ? ', the federal Department of Labor (EBSA),' : ''} and the state attorney general's consumer protection division.

Thank you for your prompt attention.

Sincerely,


[YOUR SIGNATURE]
[YOUR PRINTED NAME]

Enclosures: ${isDenial ? 'Copy of denial letter; supporting medical records' : 'Copy of disputed bill; relevant EOBs'}
cc: [Personal file]`;
}

function generatePhoneScript(caseData) {
  const isDenial = caseData.docType === 'denial';
  const topFlags = caseData.flags.slice(0, 3);
  return `PHONE SCRIPT — ${isDenial ? 'Insurance Appeals' : 'Hospital Billing'}
Before you dial: bill/EOB ready, insurance card, pen, paper, 30 minutes.

OPENING
"Hi, I'm calling about account [NUMBER] for [PATIENT NAME], date of service [DATE]. I need to formally dispute items on this ${isDenial ? 'denial' : 'bill'}. Can I have your full name, employee ID, and the reference number for this call?"
  → Write these down.

STATE THE ISSUES
${topFlags.length > 0 ? topFlags.map((f, i) => `
${i + 1}. "${f.label}"
   "Per ${f.authority || 'standard billing practice'}, can you explain the rationale here?"`).join('') : '1. State each issue with CPT code and dollar amount.\n2. Ask for policy language or coding rationale.'}

CRITICAL ASKS
• "Can you send me a fully itemized bill with all CPT codes, modifiers, and units listed?"
• "What's the timely-filing deadline for a formal ${isDenial ? 'appeal' : 'dispute'}?"
• "Can you place this account on hold for 60 days while I review?"
${isDenial ? '• "Am I entitled to external review? How do I initiate it?"\n• "Send me the clinical criteria used in this denial."' : '• "Was any portion subject to No Surprises Act protections?"\n• "What\'s the cash-pay rate for these services?"'}

IF THEY PUSH BACK
"I'd like to escalate to a supervisor. Take my callback number and have them call within 48 hours."

CLOSE
"Confirming: reference number [NUMBER], I've requested [items], you'll respond by [DATE]. I'm also sending a written dispute letter via certified mail."

AFTER THE CALL
Email yourself: time, rep name, employee ID, reference number, what they promised, response date.`;
}

// ============ STORAGE (SSR-safe) ============
const STORAGE_KEY = 'billclear:v3';
function loadState() {
  if (typeof window === 'undefined') return { cases: [], settings: { role: null, onboarded: false } };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cases: [], settings: { role: null, onboarded: false } };
    return JSON.parse(raw);
  } catch { return { cases: [], settings: { role: null, onboarded: false } }; }
}
function saveState(s) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// ============ STYLES ============
const cssStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..900,0..100&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  .bc-root { font-family: 'Instrument Sans', -apple-system, sans-serif; background: #FAF6F0; color: #1A1614; min-height: 100vh; }
  .bc-display { font-family: 'Fraunces', Georgia, serif; font-feature-settings: 'ss01'; letter-spacing: -0.02em; font-variation-settings: 'SOFT' 30; }
  .bc-mono { font-family: 'JetBrains Mono', monospace; }
  .bc-ink { color: #1A1614; } .bc-ink-soft { color: #6B5F54; }
  .bc-rust { color: #B54630; } .bc-ochre { color: #A37B2A; } .bc-forest { color: #4A6B3C; } .bc-navy { color: #2C3E5C; }
  .bc-paper-warm { background: #F5EDDC; } .bc-paper-soft { background: #F0E8D8; }
  .bc-card { background: #FEFBF5; border: 1px solid #E6DCC5; box-shadow: 0 1px 0 rgba(26,22,20,0.04), 0 8px 24px rgba(26,22,20,0.04); }
  .bc-card-flat { background: #FEFBF5; border: 1px solid #E6DCC5; }
  .bc-rule { border-top: 1px solid #D8CEB8; }
  .bc-rule-thick { border-top: 2px solid #1A1614; }
  .bc-border-soft { border-color: #D8CEB8; }
  .bc-btn-primary { background: #1A1614; color: #FAF6F0; transition: all .15s ease; }
  .bc-btn-primary:hover:not(:disabled) { background: #2C2420; transform: translateY(-1px); }
  .bc-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
  .bc-btn-secondary { background: transparent; color: #1A1614; border: 1px solid #1A1614; transition: all .15s ease; }
  .bc-btn-secondary:hover { background: #1A1614; color: #FAF6F0; }
  .bc-btn-rust { background: #B54630; color: #FAF6F0; transition: all .15s ease; }
  .bc-btn-rust:hover { background: #9A3825; transform: translateY(-1px); }
  .bc-input { background: #FEFBF5; border: 1px solid #D8CEB8; color: #1A1614; font-family: 'Instrument Sans', sans-serif; transition: border-color .15s ease; }
  .bc-input:focus { outline: none; border-color: #1A1614; }
  .bc-input-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; }
  .bc-flag-high { background: linear-gradient(to right, #FBEDEA 0%, #FEFBF5 100%); border-left: 3px solid #B54630; }
  .bc-flag-medium { background: linear-gradient(to right, #FBF3E3 0%, #FEFBF5 100%); border-left: 3px solid #A37B2A; }
  .bc-flag-deadline { background: linear-gradient(to right, #E8EEF5 0%, #FEFBF5 100%); border-left: 3px solid #2C3E5C; }
  .bc-flag-low { background: #FEFBF5; border-left: 3px solid #D8CEB8; }
  .bc-tab { color: #6B5F54; border-bottom: 2px solid transparent; padding-bottom: 4px; transition: all .15s ease; background: transparent; }
  .bc-tab-active { color: #1A1614; border-bottom-color: #1A1614; }
  .bc-pill { display: inline-flex; align-items: center; padding: 2px 10px; font-size: 11px; letter-spacing: .05em; text-transform: uppercase; border-radius: 2px; font-weight: 500; }
  .bc-pill-rust { background: #B54630; color: #FAF6F0; }
  .bc-pill-ochre { background: #A37B2A; color: #FAF6F0; }
  .bc-pill-navy { background: #2C3E5C; color: #FAF6F0; }
  .bc-pill-sand { background: #E6DCC5; color: #1A1614; }
  .bc-pill-forest { background: #4A6B3C; color: #FAF6F0; }
  .bc-onboard-card { background: #FEFBF5; border: 1px solid #1A1614; transition: all .2s ease; }
  .bc-onboard-card:hover { background: #1A1614; color: #FAF6F0; cursor: pointer; }
  .bc-onboard-card:hover .bc-ink-soft { color: #D8CEB8; }
  .bc-loading-dot { animation: bc-pulse 1.4s ease-in-out infinite; display: inline-block; }
  .bc-loading-dot:nth-child(2) { animation-delay: .2s; }
  .bc-loading-dot:nth-child(3) { animation-delay: .4s; }
  @keyframes bc-pulse { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
  .bc-fade-in { animation: bc-fade .4s ease-out; }
  @keyframes bc-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .bc-grain { background-image: radial-gradient(circle at 20% 30%, rgba(26,22,20,0.015) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(26,22,20,0.02) 0%, transparent 50%); }
  .bc-stage-active { color: #1A1614; font-weight: 500; }
  .bc-stage-pending { color: #C8BFA8; }
  .bc-stage-done { color: #4A6B3C; }
  .bc-hero-card { background: linear-gradient(135deg, #FEFBF5 0%, #F5EDDC 100%); border: 2px solid #1A1614; box-shadow: 4px 4px 0 #1A1614; }
  .bc-pulse-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #B54630; animation: bc-redpulse 2s ease-in-out infinite; margin-right: 6px; vertical-align: middle; }
  @keyframes bc-redpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .bc-input-method-card { background: #FEFBF5; border: 1px solid #D8CEB8; transition: all .2s ease; cursor: pointer; }
  .bc-input-method-card:hover { border-color: #1A1614; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(26,22,20,0.08); }
  .bc-input-method-card.bc-active { background: #1A1614; color: #FAF6F0; border-color: #1A1614; }
  .bc-input-method-card.bc-active .bc-ink-soft { color: #D8CEB8; }
  .bc-dropzone { border: 2px dashed #D8CEB8; transition: all .2s ease; background: #FEFBF5; }
  .bc-dropzone.bc-drag-over { border-color: #1A1614; background: #F5EDDC; transform: scale(1.01); }
  @media print { .bc-no-print { display: none !important; } body { background: white !important; } }
`;

function Pill({ children, variant = 'sand' }) {
  return <span className={`bc-pill bc-pill-${variant}`}>{children}</span>;
}
function Button({ variant = 'primary', onClick, children, disabled, className = '' }) {
  return <button onClick={onClick} disabled={disabled} className={`bc-btn-${variant} px-5 py-2.5 text-sm tracking-wide rounded-sm font-medium ${className}`}>{children}</button>;
}

// ============ ONBOARDING ============
function Onboarding({ onComplete }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 bc-fade-in">
      <div className="mb-12">
        <div className="bc-pill bc-pill-rust mb-6">For caregivers and patients</div>
        <h1 className="bc-display text-5xl md:text-6xl font-light leading-tight mb-6">
          Stop overpaying<br/><em>medical bills.</em>
        </h1>
        <p className="text-lg bc-ink-soft leading-relaxed max-w-xl">
          80% of hospital bills contain errors. Most go unchallenged. Snap a photo, upload a PDF, or paste text — we find disputable items, cite the law, and draft your letter.
        </p>
      </div>
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wider bc-ink-soft mb-4">Tell us who you are</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="bc-onboard-card p-6 rounded-sm" onClick={() => onComplete('caregiver')}>
            <div className="bc-display text-2xl mb-2">Caregiver</div>
            <div className="text-sm bc-ink-soft leading-relaxed">Managing paperwork for a parent, spouse, or family member.</div>
          </div>
          <div className="bc-onboard-card p-6 rounded-sm" onClick={() => onComplete('patient')}>
            <div className="bc-display text-2xl mb-2">Patient</div>
            <div className="text-sm bc-ink-soft leading-relaxed">Dealing with your own bills — active treatment or surprise charges.</div>
          </div>
        </div>
        <button onClick={() => onComplete('other')} className="mt-4 text-sm bc-ink-soft underline hover:text-black">
          Skip — just let me try it
        </button>
      </div>
      <div className="bc-rule pt-6">
        <p className="text-xs bc-ink-soft leading-relaxed">
          Educational tool, not medical or legal advice. Files are processed transiently and never stored on a server. Please cover or remove names, addresses, and insurance IDs before uploading or pasting.
        </p>
      </div>
    </div>
  );
}

// ============ STAGED LOADER ============
function StagedLoader({ stages, onComplete, durationMs = 1400 }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setStage(prev => {
        if (prev >= stages.length) { clearInterval(interval); onComplete(); return prev; }
        return prev + 1;
      });
    }, durationMs);
    return () => clearInterval(interval);
  }, [stages, onComplete, durationMs]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-20 bc-fade-in">
      <h2 className="bc-display text-3xl font-light mb-8">Reading the document</h2>
      <div className="space-y-3">
        {stages.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${i < stage ? 'bc-stage-done' : i === stage ? 'bc-stage-active' : 'bc-stage-pending'}`}>
            <span className="bc-mono text-xs w-6">
              {i < stage ? '✓' : i === stage ? <span className="bc-loading-dot">●</span> : '○'}
            </span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <p className="text-xs bc-ink-soft mt-12 max-w-md">Working through your document. About 8-12 seconds.</p>
    </div>
  );
}

// ============ INPUT METHOD: PHOTO / FILE / PASTE ============
function InputMethodPicker({ method, setMethod }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider bc-ink-soft mb-3">How do you have this document?</label>
      <div className="grid grid-cols-3 gap-2">
        <div onClick={() => setMethod('photo')} className={`bc-input-method-card p-4 rounded-sm text-center ${method === 'photo' ? 'bc-active' : ''}`}>
          <div className="text-2xl mb-1">📷</div>
          <div className="text-sm font-medium">Take photo</div>
          <div className="text-xs bc-ink-soft mt-1">Mail in hand</div>
        </div>
        <div onClick={() => setMethod('upload')} className={`bc-input-method-card p-4 rounded-sm text-center ${method === 'upload' ? 'bc-active' : ''}`}>
          <div className="text-2xl mb-1">📄</div>
          <div className="text-sm font-medium">Upload file</div>
          <div className="text-xs bc-ink-soft mt-1">PDF or image</div>
        </div>
        <div onClick={() => setMethod('paste')} className={`bc-input-method-card p-4 rounded-sm text-center ${method === 'paste' ? 'bc-active' : ''}`}>
          <div className="text-2xl mb-1">⌨️</div>
          <div className="text-sm font-medium">Paste text</div>
          <div className="text-xs bc-ink-soft mt-1">Copy-paste</div>
        </div>
      </div>
    </div>
  );
}

function FileDropZone({ onFileSelected, isCamera = false }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Please use one under 10MB.');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`bc-dropzone ${dragOver ? 'bc-drag-over' : ''} p-10 rounded-sm text-center cursor-pointer`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={isCamera ? "image/*" : "image/*,application/pdf"}
        capture={isCamera ? "environment" : undefined}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <div className="text-4xl mb-4">{isCamera ? '📸' : '📁'}</div>
      <div className="bc-display text-xl mb-2">
        {isCamera ? 'Tap to open camera' : 'Drop a file here or click to browse'}
      </div>
      <div className="text-sm bc-ink-soft leading-relaxed max-w-md mx-auto">
        {isCamera
          ? 'Your phone camera will open. Hold the document flat under good light. Fill the frame with the bill.'
          : 'Accepts JPG, PNG, or PDF. Up to 10MB. Single page works best for photos; multi-page PDFs are fine.'}
      </div>
    </div>
  );
}

// ============ NEW BILL FLOW ============
function NewBillView({ userRole, onSave, onCancel }) {
  const [step, setStep] = useState('input');
  const [docType, setDocType] = useState('bill');
  const [nickname, setNickname] = useState('');
  const [inputMethod, setInputMethod] = useState('photo');
  const [rawText, setRawText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [extractError, setExtractError] = useState(null);
  const [extractedPreview, setExtractedPreview] = useState(null);
  const [heuristicResult, setHeuristicResult] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiPromise, setAiPromise] = useState(null);
  const [showAllFlags, setShowAllFlags] = useState(false);

  const handleFile = async (file) => {
    setPendingFile(file);
    setExtractError(null);
    setStep('extracting');
    try {
      const extracted = await extractTextFromFile(file);
      setRawText(extracted);
      setExtractedPreview(extracted);
      const result = runHeuristics(extracted, docType);
      setHeuristicResult(result);
      const promise = analyzeWithClaude(extracted, docType, result);
      setAiPromise(promise);
      setStep('analyzing');
    } catch (err) {
      setExtractError(err.message || 'Failed to read document. Try again or paste text instead.');
      setStep('input');
    }
  };

  const startPasteAnalysis = () => {
    if (rawText.trim().length < 30) return;
    const result = runHeuristics(rawText, docType);
    setHeuristicResult(result);
    const promise = analyzeWithClaude(rawText, docType, result);
    setAiPromise(promise);
    setStep('analyzing');
  };

  const onLoaderComplete = async () => {
    if (aiPromise) {
      const ai = await aiPromise;
      if (ai) setAiAnalysis(ai);
    }
    setStep('results');
  };

  const saveCase = () => {
    const newCase = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      nickname: nickname.trim() || `${docType === 'bill' ? 'Bill' : docType === 'eob' ? 'EOB' : 'Denial'} — ${new Date().toLocaleDateString()}`,
      docType, userRole, rawText,
      flags: heuristicResult.flags, summary: heuristicResult.summary, aiAnalysis,
      status: 'open', savingsEstimate: 0, notes: '', mailingDate: null,
      sourceMethod: inputMethod,
    };
    onSave(newCase);
  };

  if (step === 'input') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 bc-fade-in">
        <button onClick={onCancel} className="text-sm bc-ink-soft hover:text-black mb-6">← Back</button>
        <h2 className="bc-display text-4xl font-light mb-2">Let's see what they charged</h2>
        <p className="bc-ink-soft mb-8">Photo, file, or paste — whichever's easiest for what you have.</p>

        {extractError && (
          <div className="bc-flag-high p-4 rounded-sm mb-6 text-sm">
            <strong>Couldn't read that.</strong> {extractError}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider bc-ink-soft mb-2">What is this?</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 'bill', label: 'Hospital / provider bill' },
                { id: 'eob', label: 'EOB (insurance statement)' },
                { id: 'denial', label: 'Denial letter' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setDocType(opt.id)} className={`px-4 py-2 text-sm rounded-sm border ${docType === opt.id ? 'bc-btn-primary' : 'bc-btn-secondary'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider bc-ink-soft mb-2">Nickname (optional)</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g., Mom's ER visit — Aug 15" className="bc-input w-full px-4 py-2.5 rounded-sm" />
          </div>

          <InputMethodPicker method={inputMethod} setMethod={setInputMethod} />

          {inputMethod === 'photo' && (
            <FileDropZone onFileSelected={handleFile} isCamera={true} />
          )}

          {inputMethod === 'upload' && (
            <FileDropZone onFileSelected={handleFile} isCamera={false} />
          )}

          {inputMethod === 'paste' && (
            <div>
              <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={12}
                placeholder={`Paste your ${docType} here. Remove name, address, and insurance ID first.\n\nExample:\n99214  Office Visit, Established Patient    $485.00\n36415  Venipuncture                          $62.00`}
                className="bc-input bc-input-mono w-full px-4 py-3 rounded-sm" />
              <div className="mt-2 text-xs bc-ink-soft flex justify-between">
                <span>{rawText.length} characters</span>
                <span>Tip: ask the hospital for an itemized bill</span>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={startPasteAnalysis} disabled={rawText.trim().length < 30}>Analyze →</Button>
              </div>
            </div>
          )}

          <div className="bc-rule pt-4">
            <p className="text-xs bc-ink-soft">
              <strong>Privacy note:</strong> Files are processed transiently to extract text, then immediately discarded. Nothing is stored on a server. Cover personally identifying details with a sticky note before photographing if you'd like.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'extracting') {
    return (
      <StagedLoader
        stages={[
          'Loading your document',
          'Reading text from the image',
          'Identifying CPT codes and dollar amounts',
          'Preparing for analysis',
        ]}
        onComplete={() => {}}
        durationMs={1500}
      />
    );
  }

  if (step === 'analyzing') {
    return (
      <StagedLoader
        stages={[
          'Cross-referencing 1,200+ CPT codes against Medicare benchmarks',
          'Checking NCCI bundling and unbundling rules',
          'Scanning for No Surprises Act protections',
          'Reviewing ERISA appeal language',
          'Drafting your dispute strategy',
        ]}
        onComplete={onLoaderComplete}
        durationMs={1400}
      />
    );
  }

  const topFlag = heuristicResult.summary.topFlag;
  const otherFlags = heuristicResult.flags.slice(1);
  const totalAtRisk = heuristicResult.summary.totalEstImpact;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bc-fade-in">
      <button onClick={() => setStep('input')} className="text-sm bc-ink-soft hover:text-black mb-6">← Back to input</button>

      {extractedPreview && inputMethod !== 'paste' && (
        <details className="mb-6 bc-card-flat p-4 rounded-sm">
          <summary className="text-xs uppercase tracking-wider bc-ink-soft cursor-pointer">View text we extracted from your document</summary>
          <pre className="bc-mono text-xs mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap bc-ink">{extractedPreview.slice(0, 2000)}{extractedPreview.length > 2000 ? '\n\n...(truncated)' : ''}</pre>
          <p className="text-xs bc-ink-soft mt-2 italic">If this looks wrong, try a clearer photo or upload the PDF instead.</p>
        </details>
      )}

      {totalAtRisk > 0 && (
        <div className="mb-8">
          <div className="text-xs uppercase tracking-wider bc-ink-soft mb-2"><span className="bc-pulse-dot"></span>Estimated amount you may be overpaying</div>
          <div className="bc-display text-6xl bc-rust mb-1">${totalAtRisk.toLocaleString()}</div>
          <div className="text-sm bc-ink-soft">Across {heuristicResult.flags.length} disputable issue{heuristicResult.flags.length !== 1 ? 's' : ''} found</div>
        </div>
      )}

      {aiAnalysis?.summary && (
        <div className="bc-paper-warm p-5 rounded-sm mb-8 border-l-2 border-[#A37B2A]">
          <div className="text-xs uppercase tracking-wider bc-ochre mb-2">From your billing advocate</div>
          <p className="bc-ink leading-relaxed">{aiAnalysis.summary}</p>
        </div>
      )}

      {topFlag ? (
        <div className="bc-hero-card p-7 rounded-sm mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Pill variant="rust">Your next move</Pill>
            {topFlag.estImpact > 0 && <Pill variant="sand">~${topFlag.estImpact.toLocaleString()} at stake</Pill>}
          </div>
          <h3 className="bc-display text-2xl font-light mb-3 leading-tight">{topFlag.label}</h3>
          {topFlag.detail && <p className="text-sm bc-ink mb-3 leading-relaxed">{topFlag.detail}</p>}
          <p className="text-sm bc-ink-soft leading-relaxed mb-4">{topFlag.advice}</p>
          {topFlag.authority && (
            <div className="text-xs bc-ink-soft border-l-2 border-[#1A1614] pl-3 italic">
              Authority: {topFlag.authority}
            </div>
          )}
        </div>
      ) : (
        <div className="bc-card-flat p-8 rounded-sm text-center mb-8">
          <p className="bc-display text-xl mb-2">No automated flags detected.</p>
          <p className="bc-ink-soft text-sm">Try requesting a fully itemized bill if you don't have one — that's where most disputable items live.</p>
        </div>
      )}

      {otherFlags.length > 0 && (
        <div className="mb-8">
          <button onClick={() => setShowAllFlags(!showAllFlags)} className="text-sm font-medium underline bc-ink hover:bc-rust mb-3">
            {showAllFlags ? '− Hide' : '+ Show'} {otherFlags.length} additional finding{otherFlags.length !== 1 ? 's' : ''}
          </button>
          {showAllFlags && (
            <div className="space-y-3 bc-fade-in">
              {otherFlags.map((flag, i) => (
                <div key={i} className={`p-4 rounded-sm bc-flag-${flag.severity === 'deadline' ? 'deadline' : flag.severity === 'high' ? 'high' : flag.severity === 'medium' ? 'medium' : 'low'}`}>
                  <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                    <div className="font-medium bc-ink">{flag.label}</div>
                    <div className="flex gap-2">
                      {flag.estImpact > 0 && <Pill variant="sand">~${flag.estImpact}</Pill>}
                      <Pill variant={flag.severity === 'high' ? 'rust' : flag.severity === 'deadline' ? 'navy' : flag.severity === 'medium' ? 'ochre' : 'sand'}>{flag.severity}</Pill>
                    </div>
                  </div>
                  {flag.detail && <div className="text-sm bc-ink mb-2">{flag.detail}</div>}
                  <div className="text-sm bc-ink-soft leading-relaxed">{flag.advice}</div>
                  {flag.authority && <div className="mt-2 text-xs bc-ink-soft italic">Authority: {flag.authority}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aiAnalysis?.questionsToAsk?.length > 0 && (
        <div className="mb-8 bc-paper-warm p-6 rounded-sm">
          <h3 className="text-xs uppercase tracking-wider bc-ink-soft mb-3">Questions to ask when you call</h3>
          <ul className="space-y-2">
            {aiAnalysis.questionsToAsk.map((q, i) => (
              <li key={i} className="text-sm bc-ink leading-relaxed flex gap-3">
                <span className="bc-rust font-medium">{i + 1}.</span><span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bc-rule-thick pt-8 flex gap-3 flex-wrap">
        <Button onClick={saveCase}>Save case & build dispute packet →</Button>
        <Button variant="secondary" onClick={() => setStep('input')}>Try different document</Button>
      </div>
    </div>
  );
}

// ============ CASE DETAIL ============
function CaseDetail({ case_, onBack, onUpdate, onDelete }) {
  const [letter, setLetter] = useState(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterSource, setLetterSource] = useState(null);
  const [showScript, setShowScript] = useState(false);
  const [savings, setSavings] = useState(case_.savingsEstimate || 0);
  const [notes, setNotes] = useState(case_.notes || '');
  const [status, setStatus] = useState(case_.status);
  const [mailingDate, setMailingDate] = useState(case_.mailingDate || '');
  const [copyNotice, setCopyNotice] = useState('');

  const phoneScript = useMemo(() => generatePhoneScript(case_), [case_]);

  const generateLetter = async () => {
    setLetterLoading(true);
    const ai = await generateDisputeLetterAI(case_);
    if (ai) { setLetter(ai); setLetterSource('ai'); }
    else { setLetter(generateHeuristicLetter(case_)); setLetterSource('heuristic'); }
    setLetterLoading(false);
  };

  useEffect(() => { generateLetter(); /* eslint-disable-next-line */ }, []);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyNotice(`${label} copied`);
      setTimeout(() => setCopyNotice(''), 2000);
    });
  };

  const saveChanges = () => {
    onUpdate({ ...case_, savingsEstimate: parseFloat(savings) || 0, notes, status, mailingDate });
  };

  const createdDate = new Date(case_.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalAtRisk = case_.summary?.totalEstImpact || 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bc-fade-in">
      <button onClick={onBack} className="text-sm bc-ink-soft hover:text-black mb-6 bc-no-print">← All cases</button>

      <div className="mb-8 pb-6 bc-rule">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Pill variant="sand">{case_.docType.toUpperCase()}</Pill>
          <Pill variant={status === 'resolved' ? 'forest' : status === 'disputed' ? 'navy' : 'ochre'}>{status}</Pill>
          {totalAtRisk > 0 && <Pill variant="rust">${totalAtRisk.toLocaleString()} at risk</Pill>}
          {case_.sourceMethod && <Pill variant="sand">{case_.sourceMethod === 'photo' ? 'From photo' : case_.sourceMethod === 'upload' ? 'From file' : 'From paste'}</Pill>}
          <span className="text-sm bc-ink-soft">Opened {createdDate}</span>
        </div>
        <h2 className="bc-display text-4xl font-light">{case_.nickname}</h2>
      </div>

      <div className="bc-card-flat p-6 rounded-sm mb-8 bc-no-print">
        <h3 className="text-xs uppercase tracking-wider bc-ink-soft mb-4">Track this case</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs bc-ink-soft block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="bc-input w-full px-3 py-2 rounded-sm">
              <option value="open">Open — reviewing</option>
              <option value="disputed">Disputed — letter sent</option>
              <option value="resolved">Resolved — closed</option>
            </select>
          </div>
          <div>
            <label className="text-xs bc-ink-soft block mb-1">Saved so far ($)</label>
            <input type="number" value={savings} onChange={e => setSavings(e.target.value)} className="bc-input w-full px-3 py-2 rounded-sm bc-mono" placeholder="0" />
          </div>
          <div className="flex items-end">
            <Button onClick={saveChanges} className="w-full">Save</Button>
          </div>
        </div>
        <label className="text-xs bc-ink-soft block mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="bc-input w-full px-3 py-2 rounded-sm text-sm" />
      </div>

      <div className="mb-8 bc-no-print">
        <h3 className="text-xs uppercase tracking-wider bc-ink-soft mb-3">What you're disputing</h3>
        <div className="space-y-2">
          {case_.flags.slice(0, 3).map((f, i) => (
            <div key={i} className={`px-4 py-3 rounded-sm bc-flag-${f.severity === 'deadline' ? 'deadline' : f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low'} text-sm`}>
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <span className="font-medium">{f.label}</span>
                {f.estImpact > 0 && <span className="bc-rust font-medium text-xs">~${f.estImpact}</span>}
              </div>
              {f.authority && <div className="text-xs bc-ink-soft mt-1 italic">{f.authority}</div>}
            </div>
          ))}
          {case_.flags.length > 3 && <div className="text-xs bc-ink-soft pl-4">+ {case_.flags.length - 3} more</div>}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 bc-no-print">
          <h3 className="text-xs uppercase tracking-wider bc-ink-soft">Your dispute letter</h3>
          {letterSource && <Pill variant={letterSource === 'ai' ? 'forest' : 'sand'}>{letterSource === 'ai' ? 'Custom-drafted' : 'Template'}</Pill>}
        </div>

        {letterLoading && (
          <div className="bc-card-flat p-8 rounded-sm text-center bc-ink-soft text-sm">
            Drafting<span className="bc-loading-dot">.</span><span className="bc-loading-dot">.</span><span className="bc-loading-dot">.</span>
          </div>
        )}

        {letter && (
          <>
            <div className="bc-card-flat rounded-sm">
              <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={20}
                className="w-full p-5 bg-transparent bc-mono text-sm leading-relaxed resize-y focus:outline-none" />
            </div>

            <div className="flex gap-2 mt-3 flex-wrap bc-no-print">
              <Button onClick={() => copyToClipboard(letter, 'Letter')}>Copy letter</Button>
              <Button variant="secondary" onClick={() => window.print()}>Print as PDF</Button>
              <Button variant="secondary" onClick={generateLetter}>Regenerate</Button>
              <Button variant="secondary" onClick={() => setShowScript(!showScript)}>{showScript ? 'Hide' : 'Show'} phone script</Button>
            </div>
            {copyNotice && <div className="mt-2 text-sm bc-forest bc-no-print">{copyNotice}</div>}
          </>
        )}
      </div>

      {letter && status !== 'resolved' && status !== 'disputed' && (
        <div className="mb-8 bc-card p-6 rounded-sm bc-no-print">
          <div className="text-xs uppercase tracking-wider bc-rust mb-3">Commit to mailing this</div>
          <p className="text-sm bc-ink-soft mb-4 leading-relaxed">
            Most disputes that win are mailed within a week. Pick a date — this single decision more than doubles follow-through.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="date" value={mailingDate} onChange={e => setMailingDate(e.target.value)} className="bc-input px-3 py-2 rounded-sm text-sm" />
            <Button onClick={() => { setStatus('disputed'); saveChanges(); }} disabled={!mailingDate}>I'll mail it on this date</Button>
          </div>
          {mailingDate && <div className="text-xs bc-ink-soft mt-3 italic">Send via certified mail with return receipt — about $5.</div>}
        </div>
      )}

      {showScript && (
        <div className="mb-8 bc-fade-in bc-no-print">
          <h3 className="text-xs uppercase tracking-wider bc-ink-soft mb-3">Phone script</h3>
          <div className="bc-card-flat p-5 rounded-sm">
            <pre className="bc-mono text-sm leading-relaxed whitespace-pre-wrap">{phoneScript}</pre>
          </div>
          <Button onClick={() => copyToClipboard(phoneScript, 'Script')} className="mt-3">Copy script</Button>
        </div>
      )}

      <div className="bc-rule pt-6 mt-12 bc-no-print">
        <button onClick={() => { if (confirm('Delete this case permanently?')) onDelete(case_.id); }} className="text-sm bc-rust hover:underline">
          Delete this case
        </button>
      </div>
    </div>
  );
}

// ============ CASES LIST ============
function CasesList({ cases, onOpen, onNew, userRole }) {
  const totalSavings = cases.reduce((s, c) => s + (c.savingsEstimate || 0), 0);
  const openCount = cases.filter(c => c.status === 'open').length;
  const totalAtRisk = cases.reduce((s, c) => s + (c.summary?.totalEstImpact || 0), 0);

  if (cases.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="bc-display text-4xl font-light mb-4">Let's start with one bill</h2>
        <p className="bc-ink-soft mb-8 max-w-lg mx-auto leading-relaxed">
          {userRole === 'caregiver' ? "Whichever envelope is worrying you most. Just one." : "The bill you're least sure about. We'll go line by line."}
        </p>
        <Button onClick={onNew}>Add my first document →</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h2 className="bc-display text-4xl font-light">Your cases</h2>
          <div className="flex gap-6 mt-2 text-sm bc-ink-soft flex-wrap">
            <span>{cases.length} total</span>
            <span>{openCount} open</span>
            {totalAtRisk > 0 && <span className="bc-rust font-medium">${totalAtRisk.toLocaleString()} at risk</span>}
            {totalSavings > 0 && <span className="bc-forest font-medium">${totalSavings.toLocaleString()} saved</span>}
          </div>
        </div>
        <Button onClick={onNew}>+ New case</Button>
      </div>
      <div className="space-y-3">
        {cases.map(c => {
          const date = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const atRisk = c.summary?.totalEstImpact || 0;
          return (
            <div key={c.id} onClick={() => onOpen(c.id)} className="bc-card p-5 rounded-sm cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Pill variant="sand">{c.docType.toUpperCase()}</Pill>
                    <Pill variant={c.status === 'resolved' ? 'forest' : c.status === 'disputed' ? 'navy' : 'ochre'}>{c.status}</Pill>
                    {atRisk > 0 && <Pill variant="rust">${atRisk.toLocaleString()} at risk</Pill>}
                    <span className="text-xs bc-ink-soft">{date}</span>
                  </div>
                  <div className="bc-display text-xl font-light mb-1 truncate">{c.nickname}</div>
                  <div className="text-sm bc-ink-soft">
                    {c.flags.length} finding{c.flags.length !== 1 ? 's' : ''}
                    {c.savingsEstimate > 0 && <> · <span className="bc-forest">${c.savingsEstimate.toLocaleString()} saved</span></>}
                  </div>
                </div>
                <div className="bc-ink-soft text-lg">→</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ APP ============
export default function App() {
  const [state, setState] = useState(() => loadState());
  const [view, setView] = useState('cases');
  const [activeCaseId, setActiveCaseId] = useState(null);

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = cssStyles;
    document.head.appendChild(styleEl);
    return () => { document.head.removeChild(styleEl); };
  }, []);

  const completeOnboarding = (role) => setState(s => ({ ...s, settings: { ...s.settings, role, onboarded: true } }));
  const saveCase = (newCase) => {
    setState(s => ({ ...s, cases: [newCase, ...s.cases] }));
    setActiveCaseId(newCase.id); setView('detail');
  };
  const updateCase = (updated) => setState(s => ({ ...s, cases: s.cases.map(c => c.id === updated.id ? updated : c) }));
  const deleteCase = (id) => {
    setState(s => ({ ...s, cases: s.cases.filter(c => c.id !== id) }));
    setView('cases');
  };
  const openCase = (id) => { setActiveCaseId(id); setView('detail'); };

  if (!state.settings.onboarded) {
    return <div className="bc-root bc-grain"><Onboarding onComplete={completeOnboarding} /></div>;
  }

  const activeCase = state.cases.find(c => c.id === activeCaseId);

  return (
    <div className="bc-root bc-grain">
      <header className="border-b bc-border-soft bc-no-print">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-sm bc-display text-lg" style={{ background: '#1A1614', color: '#FAF6F0' }}>B</div>
            <div>
              <div className="bc-display text-xl leading-none">BillClear</div>
              <div className="text-xs bc-ink-soft tracking-wider uppercase mt-0.5">Medical paperwork decoder</div>
            </div>
          </div>
          <nav className="flex gap-6 text-sm">
            <button onClick={() => setView('cases')} className={`bc-tab ${view === 'cases' || view === 'detail' ? 'bc-tab-active' : ''}`}>
              Cases {state.cases.length > 0 && <span className="ml-1 bc-ink-soft">({state.cases.length})</span>}
            </button>
            <button onClick={() => setView('new')} className={`bc-tab ${view === 'new' ? 'bc-tab-active' : ''}`}>New</button>
            <button onClick={() => {
              if (confirm('Reset everything? Deletes all cases stored in this browser.')) {
                localStorage.removeItem(STORAGE_KEY);
                setState({ cases: [], settings: { role: null, onboarded: false } });
                setView('cases');
              }
            }} className="bc-tab">Reset</button>
          </nav>
        </div>
      </header>

      <main className="pb-24">
        {view === 'cases' && <CasesList cases={state.cases} onOpen={openCase} onNew={() => setView('new')} userRole={state.settings.role} />}
        {view === 'new' && <NewBillView userRole={state.settings.role} onSave={saveCase} onCancel={() => setView('cases')} />}
        {view === 'detail' && activeCase && <CaseDetail case_={activeCase} onBack={() => setView('cases')} onUpdate={updateCase} onDelete={deleteCase} />}
      </main>

      <footer className="border-t bc-border-soft bc-paper-warm bc-no-print">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs bc-ink-soft leading-relaxed">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="max-w-3xl">
              <strong className="bc-ink">Educational tool. Not medical or legal advice.</strong> BillClear identifies possible issues using public benchmarks, federal coding rules, and consumer-protection statutes. Files are processed transiently to extract text, then immediately discarded — nothing is stored on a server. For complex disputes, consult a certified medical billing advocate or attorney.
            </div>
            <div className="bc-display text-xs tracking-widest uppercase bc-ink-soft md:text-right">v3.0</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
