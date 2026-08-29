/**
 * Readynez: 'How replaceable are you?' AI Replaceability Check
 * ------------------------------------------------------------
 * One script that (1) builds the Google Form with role branching,
 * (2) links a response sheet, (3) installs an on-submit trigger that
 * scores each response and emails the AI Replaceability Score.
 *
 * HOW TO USE
 *   1. script.google.com  >  New project  >  paste this whole file  >  Save.
 *   2. Select the function  buildForm  in the toolbar and press Run.
 *      Approve the permissions when asked (Forms, Sheets, Gmail, Triggers).
 *   3. Open View > Logs (or Executions). The log prints the form's
 *      public link, the edit link and the response sheet link.
 *   4. To change the result email, edit the RESULT_EMAIL section below and Save.
 *      No need to rebuild the form.
 *
 * SCORING (0 to 100, higher = more replaceable)
 *   Role baseline           0-10  job title, now only a tenth of the score
 *   Your work               0-34  how routine it is, and what a twice as capable AI would take
 *   AI judgment             0-32  what you built with AI, and how you decide its output is good enough
 *   Your standing           0-24  scarcity, accountability, industry depth, training invested
 *   Bands: 0-39 Low, 40-57 Moderate, 58-100 High
 */

var FORM_TITLE = 'How replaceable are you? The AI Replaceability Check';
var SENDER_NAME = 'Readynez';
var REPLY_TO = ''; // e.g. 'marketing@readynez.com' (leave blank to use the account that runs the script)

// ---- Role baselines (0-30). Microsoft Research 2025 applicability scores where published:
// web developers 0.35, data scientists 0.36 (top-40 list). Others are placed relative to those.
var ROLES = [
  'Software development',
  'Cloud and infrastructure',
  'Cyber security',
  'IT support and operations',
  'Data and AI',
  'IT management or leadership',
  'Other'
];
var ROLE_BASELINE = {
  'Software development': 9,
  'Cloud and infrastructure': 7,
  'Cyber security': 6,
  'IT support and operations': 10,
  'Data and AI': 9,
  'IT management or leadership': 7,
  'Other': 8
};
var ROLE_TASKS = {
  'Software development': ['Writing routine code','Explaining or reviewing code','Writing tests','Debugging','Documentation','Refactoring','Architecture and design decisions'],
  'Cloud and infrastructure': ['Writing scripts and infrastructure code','Troubleshooting incidents','Monitoring and alert triage','Runbooks and documentation','Cost and capacity analysis','Architecture and design'],
  'Cyber security': ['Alert triage','Log analysis','Phishing and email analysis','Vulnerability prioritisation','Policy and report writing','Incident response decisions'],
  'IT support and operations': ['First-line ticket responses','Knowledge base articles','Troubleshooting guidance','Access and account requests','User communication','Escalation decisions'],
  'Data and AI': ['Writing queries and pipelines','Data cleaning','Analysis and reporting','Building models','Documentation','Deciding what to measure'],
  'IT management or leadership': ['Status reports and documentation','Planning and estimates','Meeting summaries','Vendor and budget analysis','Screening candidates','People and team decisions'],
  'Other': ['Writing or reviewing code','Documentation and reports','Troubleshooting','Monitoring and routine maintenance','Analysis and reporting','Planning and design decisions']
};
var NONE_YET = 'None of these yet';

// ---- Question titles (used as keys when reading responses; keep in sync)
var Q = {
  role: 'What is your main area of work?',
  share: 'Roughly what share of your working week does AI meaningfully help with today?',
  tasks: 'Which of these does AI already do well enough that you trust it with little checking?',
  complexity: 'Which best describes most of the work you are personally responsible for?',
  agent: 'Have you built anything with AI that now does part of your job for you?',
  pays: 'Who pays for the AI tools you use for work?',
  validate: 'When AI produces work you might actually use, how do you decide whether it is good enough?',
  think: 'Has AI given you time back, and what happened to it?',
  escalate: 'When colleagues hit a problem that documentation and AI cannot solve, how often are you one of the people they come to?',
  domain: 'How much does your work depend on knowing one industry well?',
  account: 'Does anything at work carry your name in a way that makes you accountable?',
  training: 'What have you actually invested in building AI skills in the last 12 months?',
  plan: 'Has your employer given you a clear plan for how AI will affect your role and what you should learn?',
  worry: 'How worried are you about AI and your own job over the next three years?',
  twox: 'Imagine AI becomes twice as capable as it is today. What happens to your role?',
  next: 'If time and budget were not a problem, which skill would you invest in next?',
  advice: 'In one sentence, what would you tell someone entering IT today?',
  email: 'Where should we send your score?',
  consent: 'Consent'
};

var OPT = {
  share: ['None','Under 10%','10 to 25%','25 to 50%','More than 50%'],
  complexity: ['I mostly follow established processes to complete clearly defined tasks','I mostly execute defined technical work, but regularly need judgment to handle exceptions','I regularly diagnose problems where the cause or solution is not obvious','I design solutions and make technical decisions where there are several possible approaches','I mainly decide what problems should be solved, set direction, or take responsibility for outcomes'],
  agent: ['Yes, and I use it regularly','Yes, I built something but it did not stick','No, but I know roughly how I would','No'],
  pays: ['I pay for a plan out of my own pocket','My employer pays for a plan I actually use','I only use the free tiers','I do not really use AI tools'],
  validate: ['I generally use the output if it looks reasonable','I review it manually and make corrections','I test or validate it against the requirements before using it','I challenge the output, test assumptions and verify important parts independently','It depends on the risk. Low-risk work gets lighter checking, important work gets rigorous validation','I do not use AI to produce work like this'],
  think: ['Yes, and I spend it on harder problems that never got attention before','Yes, but it filled up with more of the same kind of work','No, my workload just went up','AI has not really changed how my time is spent'],
  escalate: ['I am usually the final escalation point','Often','Sometimes','Rarely','Never'],
  domain: ['A lot. I know the rules, constraints and edge cases of my industry','Some. It helps, but most of my work would transfer elsewhere','Very little. My work is much the same whichever industry I am in'],
  account: ['Yes. Work does not ship without my approval','Sometimes. I sign off on some things','No. My work is checked by someone else, or by nobody'],
  training: ['Nothing','Only free tutorials and videos','I paid for a course myself','My employer paid for structured training','I hold an AI certification'],
  plan: ['Yes, a clear plan with training','Some training, but no clear plan','They talk about AI, but nothing concrete','Nothing at all','Not applicable, I am self-employed'],
  twox: ['Most of what I currently do could probably be automated','A significant part could be automated, but I would still be needed to supervise or correct it','AI could do more of the execution, while I would still need to make the technical decisions','AI would make me much more productive, but the hardest parts of my role would remain mine','My role would probably become more valuable, because I would be responsible for deciding how AI is used'],
  next: ['Using Copilot and similar AI tools properly in my daily work','Building or integrating AI into software','AI security, governance and responsible use','Cloud and infrastructure for AI workloads','Data skills','Leading AI projects and teams','A Microsoft AI certification such as AI-900 or AI-102','None, I am fine as I am'],
  consent: ['Yes, send me my AI Replaceability Score, the full report when it is published, and occasional Readynez tips on staying hard to replace. I can unsubscribe at any time.']
};

// =====================================================================
// 1. BUILD THE FORM
// =====================================================================
function buildForm() {
  var form = FormApp.create(FORM_TITLE);
  form.setDescription(
    '41% of employers plan to cut jobs where AI can do the work. 92 million roles will be displaced by 2030, ' +
    'and 40% of the skills in yours will change (World Economic Forum, Future of Jobs 2025). ' +
    'Microsoft Research already lists web developers and data scientists among the 40 occupations most exposed to AI.\n\n' +
    'Most IT professionals assume it is someone else\'s role. Find out in 3 minutes.\n\n' +
    'You get your AI Replaceability Score by email within a minute: how easily AI could do your job today, ' +
    'and what would make you hard to replace. You also get the full report before it is published.\n\n' +
    'Free. 13 questions. Your individual answers are never shared.'
  );
  form.setProgressBar(true);
  form.setShowLinkToRespondAgain(false);
  form.setPublishingSummary(true);
  form.setConfirmationMessage(
    'Thank you. Your AI Replaceability Score is on its way to your inbox (check spam if it has not arrived in a few minutes). ' +
    'Use the link below to see how everyone else has answered so far.'
  );

  // ---- Page 1: role (the branch switch), years, share of week. All three stay on one page
  //      because Google Forms branches at the END of the page that holds the choice question.
  var roleItem = form.addMultipleChoiceItem().setTitle(Q.role).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.share)
    .setHelpText('Think about the AI tools you actually use, such as Copilot, ChatGPT, Claude or Gemini, not the ones you have read about.')
    .setChoiceValues(OPT.share).setRequired(true);

  // ---- Branched task sections (one per role)
  var roleBreaks = {};
  var roleBreakList = [];
  ROLES.forEach(function(role) {
    var pb = form.addPageBreakItem().setTitle('AI in your work: ' + role.toLowerCase());
    roleBreaks[role] = pb;
    roleBreakList.push(pb);
    form.addCheckboxItem().setTitle(Q.tasks)
      .setHelpText('Tick all that apply.')
      .setChoiceValues(ROLE_TASKS[role].concat([NONE_YET]))
      .setRequired(true);
  });

  // ---- Common section after the branch
  var afterBreak = form.addPageBreakItem().setTitle('What has changed, and what have you done about it?')
    .setHelpText('No judgement. Most people\'s honest answer is "not as much as I meant to".');
  form.addMultipleChoiceItem().setTitle(Q.complexity).setHelpText('Think about what you are paid to do, not your job title.').setChoiceValues(OPT.complexity).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.agent).setHelpText('A script, an agent, a Copilot workflow, an automation.').setChoiceValues(OPT.agent).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.pays).setChoiceValues(OPT.pays).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.validate).setChoiceValues(OPT.validate).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.think).setChoiceValues(OPT.think).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.escalate).setChoiceValues(OPT.escalate).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.domain).setChoiceValues(OPT.domain).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.account).setChoiceValues(OPT.account).setRequired(true);
  form.addCheckboxItem().setTitle(Q.training).setHelpText('Tick all that apply.').setChoiceValues(OPT.training).setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.plan).setChoiceValues(OPT.plan).setRequired(true);

  // ---- Section: honest questions
  form.addPageBreakItem().setTitle('Three honest questions')
    .setHelpText('Nobody sees your individual answers. This is what makes the comparison worth having.');
  form.addScaleItem().setTitle(Q.worry).setBounds(1, 5).setLabels('Not worried at all', 'Very worried').setRequired(true);
  form.addMultipleChoiceItem().setTitle(Q.twox).setHelpText('The 2x test.').setChoiceValues(OPT.twox).setRequired(true);

  // ---- Section: next step + email
  form.addPageBreakItem().setTitle('Last two, then your score');
  form.addCheckboxItem().setTitle(Q.next).setHelpText('Choose up to two.').setChoiceValues(OPT.next).setRequired(true);
  form.addParagraphTextItem().setTitle(Q.advice).setHelpText('Optional. We may quote it anonymously in the report.');
  var emailItem = form.addTextItem().setTitle(Q.email).setHelpText('Your score and the early copy of the report go here.').setRequired(true);
  emailItem.setValidation(FormApp.createTextValidation().requireTextIsEmail().setHelpText('Please enter a valid email address.').build());
  form.addCheckboxItem().setTitle(Q.consent).setChoiceValues(OPT.consent).setRequired(true);

  // ---- Wire the branching.
  // (a) Each role answer jumps to that role's task section after page 1.
  roleItem.setChoices(ROLES.map(function(role) { return roleItem.createChoice(role, roleBreaks[role]); }));
  // (b) In Apps Script, PageBreakItem.setGoToPage() sets where to go after completing the page BEFORE
  //     that break. So each role section jumps to the common section by setting it on the NEXT break.
  //     The last role section is followed by the common section naturally.
  for (var i = 1; i < roleBreakList.length; i++) roleBreakList[i].setGoToPage(afterBreak);

  // ---- Link a response sheet
  var ss = SpreadsheetApp.create('AI Replaceability Check: responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ---- Install the scoring trigger (replace any previous one)
  ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === 'onSubmit') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onSubmit').forForm(form).onFormSubmit().create();

  PropertiesService.getScriptProperties().setProperty('FORM_ID', form.getId());
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('PUBLIC LINK (send this): ' + form.getPublishedUrl());
  Logger.log('EDIT LINK: ' + form.getEditUrl());
  Logger.log('RESPONSES SHEET: ' + ss.getUrl());
  Logger.log('Pre-filled role links: open the edit link > three dots > Get pre-filled link, pick a role, copy.');
}

// =====================================================================
// 2. SCORE A RESPONSE
// =====================================================================
function idx(list, value) { var i = list.indexOf(value); return i < 0 ? 0 : i; }

function computeScore(a) {
  var role = ROLE_BASELINE[a.role] !== undefined ? a.role : 'Other';
  var s = {};
  s.baseline = ROLE_BASELINE[role];                                            // 0-10

  var complexityP = [13, 10, 6, 3, 0][idx(OPT.complexity, a.complexity)];      // 0-13
  var twoxP = [11, 8, 5, 2, 0][idx(OPT.twox, a.twox)];                         // 0-11
  var n = (a.tasks || []).filter(function(t) { return t !== NONE_YET && t; }).length;
  var tasksP = n === 0 ? 0 : (n <= 2 ? 2 : (n <= 4 ? 4 : 6));                  // 0-6
  var shareP = [0, 1, 2, 3, 4][idx(OPT.share, a.share)];                       // 0-4
  s.work = complexityP + twoxP + tasksP + shareP;                              // 0-34

  var agentP = [0, 6, 9, 12][idx(OPT.agent, a.agent)];                         // 0-12
  var validP = [12, 8, 5, 2, 0, 10][idx(OPT.validate, a.validate)];            // 0-12
  var thinkP = [0, 2, 4, 6][idx(OPT.think, a.think)];                          // 0-6
  var paysP = [0, 0, 1, 2][idx(OPT.pays, a.pays)];                             // 0-2, deliberately tiny
  s.judgment = agentP + validP + thinkP + paysP;                               // 0-32

  var escalateP = [0, 2, 4, 6, 8][idx(OPT.escalate, a.escalate)];              // 0-8
  var accountP = [0, 2, 5][idx(OPT.account, a.account)];                       // 0-5
  var domainP = [0, 2, 3][idx(OPT.domain, a.domain)];                          // 0-3
  var rank = { 'Nothing': 6, 'Only free tutorials and videos': 4, 'I paid for a course myself': 2, 'My employer paid for structured training': 2, 'I hold an AI certification': 1 };
  var trainingP = 6;
  (a.training || []).forEach(function(t) { if (rank[t] !== undefined) trainingP = Math.min(trainingP, rank[t]); });
  var planP = [0, 1, 2, 2, 1][idx(OPT.plan, a.plan)];                          // 0-2
  s.standing = escalateP + accountP + domainP + trainingP + planP;             // 0-24

  s.total = Math.max(0, Math.min(100, s.baseline + s.work + s.judgment + s.standing));
  s.band = s.total >= 58 ? 'High' : (s.total >= 40 ? 'Moderate' : 'Low');
  s.complexityP = complexityP; s.twoxP = twoxP; s.agentP = agentP; s.validP = validP;
  s.thinkP = thinkP; s.escalateP = escalateP; s.accountP = accountP; s.domainP = domainP;
  s.trainingP = trainingP; s.planP = planP; s.paysP = paysP; s.n = n;
  return s;
}

// =====================================================================
// 3. RESULT EMAIL
// =====================================================================
var PATHS = {
  0: ['Using Copilot and AI tools properly in your daily work', 'Hands-on, role-specific training in Copilot, ChatGPT and similar tools, built around the work you already do rather than the tools themselves.'],
  1: ['Building with AI', 'Developer training on integrating AI services into software, leading to the Microsoft AI-102 certification if you want a recognised credential.'],
  2: ['AI security and governance', 'How AI changes the threat picture and the controls, from securing AI systems to using AI in defence.'],
  3: ['Cloud and infrastructure for AI', 'Running AI workloads well on Azure and similar platforms: architecture, cost and operations.'],
  4: ['Data skills for AI', 'From better queries and pipelines to understanding models well enough to challenge them.'],
  5: ['Leading AI adoption', 'For managers: deciding where AI fits, redesigning work around it, and bringing a team along.'],
  6: ['Microsoft AI certification (AI-900 to AI-102)', 'A recognised credential that proves AI fundamentals first, then applied AI engineering.']
};
var ROLE_DEFAULT_PATH = { 'Software development': 1, 'Cloud and infrastructure': 3, 'Cyber security': 2, 'IT support and operations': 0, 'Data and AI': 4, 'IT management or leadership': 5, 'Other': 0 };
var PRODUCT_LINK = 'https://platform.readynez.com/products/unlimited-ai-copilot-training';

// The two personalised lines. Shared by the result email and the 'Web responses' tab,
// so Dynamics 365 can merge them straight from the sheet instead of recomputing them.
// The plain-English verdict shown on the result screen and in the email. Keep both in step.
function bandLabel_(band) {
  return { 'High': 'You are very likely replaceable', 'Moderate': 'You are already partly replaceable', 'Low': 'You are hard to replace, for now' }[band];
}

function driverLine_(s) {
  var d = [];
  if (s.complexityP >= 10) d.push('work that follows defined processes more than it needs your judgment');
  if (s.twoxP >= 8) d.push('expecting most of your work to be automatable if AI doubles in capability');
  if (s.validP >= 8) d.push('accepting AI output without testing it against the requirement');
  if (s.agentP >= 9) d.push('never having built anything with AI that runs without you');
  if (s.validP === 10) d.push('not using AI on the work where it would help you most');
  if (s.escalateP >= 6) d.push('rarely being the person colleagues come to when AI cannot solve it');
  if (s.accountP >= 5) d.push('no work that carries your name in a way that makes you accountable');
  if (s.thinkP >= 4) d.push('no time gained back from AI, or none of it going to harder work');
  if (s.trainingP >= 4) d.push('no money or structured time put into AI skills this year');
  if (s.domainP >= 3) d.push('no deep industry knowledge to fall back on');
  if (s.planP >= 2) d.push('an employer with no plan for what your role becomes');
  return d.length ? 'What pushed your score up: ' + d.slice(0, 3).join('; ') + '.' : 'What kept your score down: you own outcomes rather than tasks, you validate what AI gives you, and your work carries your name.';
}
function pathFor_(a) {
  var role = ROLE_BASELINE[a.role] !== undefined ? a.role : 'Other';
  var pick = null;
  (a.next || []).forEach(function(t) { var i = OPT.next.indexOf(t); if (pick === null && i >= 0 && i < 7) pick = i; });
  if (pick === null) pick = ROLE_DEFAULT_PATH[role];
  return PATHS[pick];
}

function buildResultEmail(a, s) {
  var role = ROLE_BASELINE[a.role] !== undefined ? a.role : 'Other';
  var bandLine = {
    'High': 'At ' + s.total + '/100, most of your week is work AI already handles well, and 41% of employers plan to cut jobs where AI can do the work. You found out before your employer did.',
    'Moderate': 'At ' + s.total + '/100, AI already does real work in your week, and being useful with it is now the baseline, not an advantage. You found out before your employer did.',
    'Low': 'At ' + s.total + '/100, you are harder to replace than most, because you built the skills around AI instead of just using it. The number to watch is how fast that changes.'
  }[s.band];

  var driverLine = driverLine_(s);
  var path = pathFor_(a);

  var subject = 'Your AI Replaceability Score: ' + s.total + ' out of 100 (' + s.band + ')';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#172220;max-width:600px;margin:0 auto;padding:24px">' +
    '<p style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#66716D;margin:0 0 8px">Readynez AI Replaceability Check</p>' +
    '<h1 style="font-size:26px;line-height:1.2;margin:0 0 6px">Your AI Replaceability Score: ' + s.total + ' out of 100</h1>' +
    '<p style="font-size:20px;font-weight:bold;margin:0 0 18px;color:' + (s.band === 'High' ? '#B4432E' : (s.band === 'Moderate' ? '#B37A12' : '#0B7A57')) + '">' + bandLabel_(s.band) + '</p>' +
    '<p>' + bandLine + '</p>' +
    '<p>' + driverLine + '</p>' +
    '<p style="font-size:13px;color:#66716D;border-top:1px solid #D6DCD8;padding-top:10px">How this was calculated: a baseline for ' + role.toLowerCase() + ' roles taken from Microsoft Research\'s published data on how much of each occupation\'s work generative AI can already do, adjusted for what you told us about how much AI already does in your week, your training, your employer\'s plan, and how far you expect AI to reach. It measures how replaceable your current skill set is today. It is not a prediction about you or your employer.</p>' +
    '<h2 style="font-size:19px;margin:24px 0 6px">What would make you hard to replace</h2>' +
    '<p>The people getting more valuable right now are not the ones who use AI most. They are the ones who can direct it, check it, and do the parts it still gets wrong. For a ' + role.toLowerCase() + ' professional with your answers, the first skill worth investing in is:</p>' +
    '<p><b>' + path[0] + '.</b> ' + path[1] + '</p>' +
    '<p>If you would rather cover the wider stack than pick one course, most people in your position start with <a href="' + PRODUCT_LINK + '" style="color:#0B7A57">Readynez Unlimited AI and Copilot Training</a>, which lets you take several short instructor-led AI courses over a year.</p>' +
    '<h2 style="font-size:19px;margin:24px 0 6px">What happens next</h2>' +
    '<p>Once enough IT professionals have answered, you will get a second email comparing your score with people in your role, and the full report before it is published.</p>' +
    '<p style="font-size:12px;color:#66716D;margin-top:28px">Sources: World Economic Forum, Future of Jobs Report 2025; Microsoft Research, Working with AI: Measuring the Applicability of Generative AI to Occupations (2025). You are receiving this because you asked for your score. Reply to this email to unsubscribe from further Readynez messages.</p>' +
    '</div>';
  return { subject: subject, html: html };
}

// =====================================================================
// 4. TRIGGER HANDLER
// =====================================================================
function onSubmit(e) {
  var r = e.response;
  var a = { tasks: [], training: [], next: [] };
  r.getItemResponses().forEach(function(ir) {
    var t = ir.getItem().getTitle(), v = ir.getResponse();
    if (t === Q.role) a.role = v;
    else if (t === Q.share) a.share = v;
    else if (t === Q.tasks) a.tasks = a.tasks.concat(v);
    else if (t === Q.agent) a.agent = v;
    else if (t === Q.pays) a.pays = v;
    else if (t === Q.complexity) a.complexity = v;
    else if (t === Q.validate) a.validate = v;
    else if (t === Q.think) a.think = v;
    else if (t === Q.escalate) a.escalate = v;
    else if (t === Q.domain) a.domain = v;
    else if (t === Q.account) a.account = v;
    else if (t === Q.training) a.training = [].concat(v);
    else if (t === Q.plan) a.plan = v;
    else if (t === Q.twox) a.twox = v;
    else if (t === Q.next) a.next = [].concat(v);
    else if (t === Q.email) a.email = String(v).trim();
  });
  var s = computeScore(a);
  var mail = buildResultEmail(a, s);
  var opts = { htmlBody: mail.html, name: SENDER_NAME };
  if (REPLY_TO) opts.replyTo = REPLY_TO;
  try {
    MailApp.sendEmail(a.email, mail.subject, 'Your AI Replaceability Score is ' + s.total + ' out of 100 (' + s.band + '). Open this email in an HTML-capable client to see the full result.', opts);
    logScore(a.email, s, 'sent');
  } catch (err) {
    logScore(a.email, s, 'FAILED: ' + err);      // e.g. daily email quota reached; resend with resendFailed()
  }
}

function logScore(email, s, status) {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var sh = ss.getSheetByName('Scores') || ss.insertSheet('Scores');
  if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Email','Score','Band','Role','Work','AI judgment','Standing','Email status']);
  sh.appendRow([new Date(), email, s.total, s.band, s.baseline, s.work, s.judgment, s.standing, status]);
}

// Run manually if the log shows FAILED rows (e.g. after a quota reset). Re-scores from the form's stored responses.
function resendFailed() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  var sh = ss.getSheetByName('Scores'); if (!sh) return;
  var form = FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
  var rows = sh.getDataRange().getValues();
  var failed = {};
  rows.forEach(function(r, i) { if (i > 0 && String(r[8]).indexOf('FAILED') === 0) failed[r[1]] = i + 1; });
  form.getResponses().forEach(function(resp) {
    var em = null; resp.getItemResponses().forEach(function(ir) { if (ir.getItem().getTitle() === Q.email) em = String(ir.getResponse()).trim(); });
    if (em && failed[em]) { onSubmit({ response: resp }); sh.getRange(failed[em], 9).setValue('resent'); delete failed[em]; }
  });
}

// =====================================================================
// 5. WEB ENDPOINT for the hosted page (Deploy > New deployment > Web app,
//    Execute as: Me, Who has access: Anyone). Paste the /exec URL into index.html.
//    This path stores the answers only. It sends no email. Export 'Web responses'
//    into Dynamics 365 Marketing and send the result from there.
// =====================================================================
function doPost(e) {
  var out = { ok: false };
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (body.hp) { out.ok = true; out.skipped = 'honeypot'; return json_(out); }   // bot filled the hidden field
    var a = body.answers || {};
    a.email = String(a.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) { out.error = 'invalid email'; return json_(out); }
    a.tasks = [].concat(a.tasks || []); a.training = [].concat(a.training || []); a.next = [].concat(a.next || []);
    var s = computeScore(a);

    // 1) store the full response in its own tab
    var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    var sh = ss.getSheetByName('Web responses') || ss.insertSheet('Web responses');
    if (sh.getLastRow() === 0) sh.appendRow(['Timestamp','Email','Consent','Role','Share of week','Tasks AI does well','Work complexity','Built an agent','Who pays','How AI output is validated','Time back from AI','Escalation point','Industry depth','Accountability','Training invested','Employer plan','Worry (1-5)','2x AI test','Skill next','Advice','Score','Band','Role pts','Work pts','AI judgment pts','Standing pts','Drivers','Learning path','Learning path detail','Source','Campaign','Page']);
    var path = pathFor_(a);
    sh.appendRow([new Date(), a.email, a.consent ? 'yes' : 'no', a.role || '', a.share || '', a.tasks.join('; '), a.complexity || '', a.agent || '', a.pays || '', a.validate || '', a.think || '', a.escalate || '', a.domain || '', a.account || '', a.training.join('; '), a.plan || '', a.worry || '', a.twox || '', a.next.join('; '), a.advice || '', s.total, s.band, s.baseline, s.work, s.judgment, s.standing, driverLine_(s), path[0], path[1], body.source || '', body.campaign || '', body.page || '']);

    // 2) the hosted page does NOT email. The visitor reads the score on screen, and
    //    Readynez mails the copy from Dynamics 365 Marketing after exporting this tab.
    //    That is what lifts the 100 a day MailApp cap off the campaign. See the README.
    logScore(a.email, s, 'saved (web, emailed by D365)');
    out.emailed = false;
    out.ok = true; out.score = s.total; out.band = s.band;
  } catch (err) {
    out.error = String(err);
  }
  return json_(out);
}
function doGet() { return json_({ ok: true, service: 'Readynez AI Replaceability Check' }); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Sends a sample result to yourself so you can check the email before sharing the form.
function previewEmail() {
  var a = { role: 'Software development', share: '25 to 50%', tasks: ['Writing routine code','Writing tests'],
            complexity: OPT.complexity[1], agent: 'No, but I know roughly how I would', pays: 'I only use the free tiers',
            validate: OPT.validate[1], think: OPT.think[1], escalate: 'Sometimes',
            domain: OPT.domain[1], account: OPT.account[1], training: ['Only free tutorials and videos'],
            plan: 'They talk about AI, but nothing concrete', twox: OPT.twox[1],
            next: ['Building or integrating AI into software'], email: Session.getActiveUser().getEmail() };
  var s = computeScore(a); var m = buildResultEmail(a, s);
  MailApp.sendEmail(a.email, '[PREVIEW] ' + m.subject, 'preview', { htmlBody: m.html, name: SENDER_NAME });
  Logger.log('Preview sent to ' + a.email + ' with score ' + s.total + ' (' + s.band + ')');
}
