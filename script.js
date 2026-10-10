const panel = document.querySelector('#panel');
const toast = document.querySelector('#toast');
let scene = 'signup';
let visibleRuleCount = 0;
let toastTimer;
let waitTimer;
let enteredDetails = null;
const pendingTimers = new Set();
function schedule(callback, delay) {
  const timer = setTimeout(() => { pendingTimers.delete(timer); callback(); }, delay);
  pendingTimers.add(timer);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function notice(message, kind = 'error') {
  const target = panel.querySelector('.form-notice');
  if (!target) return;
  target.className = `form-notice ${kind === 'error' ? '' : kind}`;
  target.textContent = message;
}
function blockPaste(input) {
  for (const eventType of ['paste', 'drop']) input.addEventListener(eventType, event => {
    event.preventDefault();
    notify('For security, please type that in again.');
  });
}
function blockCopy(input) {
  input.addEventListener('copy', event => {
    event.preventDefault();
    notify('Copy is unavailable for this field.');
  });
}
function moveTo(next) {
  scene = next;
  clearInterval(waitTimer);
  pendingTimers.forEach(clearTimeout);
  pendingTimers.clear();
  document.querySelector('#captchaDialog')?.remove();
  document.querySelector('#certaintyDialog')?.remove();
  if (next === 'signup' || next === 'login') enteredDetails = null;
  render();
  if (window.innerWidth < 761) document.querySelector('.form-section').scrollIntoView({behavior:'smooth',block:'start'});
  else window.scrollTo({top:0,behavior:'smooth'});
}
function frame(title, subtitle, body) {
  panel.className = `form-card${scene === 'success' ? ' award-mode' : ''}`;
  panel.innerHTML = `<h2>${title}</h2><p class="subtitle">${subtitle}</p>${body}`;
}
function attachEyes() {
  panel.querySelectorAll('.eye').forEach(button => button.addEventListener('click', () => {
    const input = panel.querySelector(`#${button.dataset.for}`);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    const label = panel.querySelector(`label[for="${button.dataset.for}"]`)?.textContent.trim().toLowerCase() || 'password';
    button.setAttribute('aria-label', `${visible ? 'Show' : 'Hide'} ${label}`);
    button.textContent = visible ? '◉' : '◎';
  }));
}
const currentYear = String(new Date().getFullYear());
const passwordRules = [
  {text:'Use at least 10 characters.', test:value=>value.length>=10},
  {text:'Include an uppercase letter.', test:value=>/[A-Z]/.test(value)},
  {text:'Include a number.', test:value=>/\d/.test(value)},
  {text:'Include a special character.', test:value=>/[^\w\s]/.test(value)},
  {text:'Include a lowercase letter, too.', test:value=>/[a-z]/.test(value)},
  {text:'Include the word “mild”.', test:value=>/mild/i.test(value)},
  {text:'End with an exclamation mark.', test:value=>value.endsWith('!')},
  {text:`Include the current year (${currentYear}).`, test:value=>value.includes(currentYear)},
  {text:'Include exactly one hyphen.', test:value=>(value.match(/-/g)||[]).length===1},
  {text:'Include the word “please”.', test:value=>/please/i.test(value)},
  {text:'Make all the digits add up to 15.', test:value=>[...value].filter(char=>/\d/.test(char)).reduce((sum,char)=>sum+Number(char),0)===15},
  {text:'Use an odd number of characters.', test:value=>value.length%2===1},
  {text:'Do not repeat a character three times in a row.', test:value=>!(/(.)\1\1/i.test(value))},
  {text:'Do not use spaces.', test:value=>!(/\s/.test(value))}
];
const initialRuleCount = 4;
function renderSignup() {
  visibleRuleCount = 0;
  frame('Create your account','Enter your details to get started.',`
    <form id="signupForm" novalidate>
      <div class="field"><label for="email">Email address</label><input id="email" type="email" placeholder="you@example.com" autocomplete="off" required></div>
      <div class="field"><label for="emailAgain">Confirm email address</label><input id="emailAgain" type="email" placeholder="you@example.com" autocomplete="off" required></div>
      <div class="field"><label for="password">Password</label><div class="input-wrap"><input id="password" type="password" placeholder="Create a password" autocomplete="new-password" required><button type="button" class="eye" data-for="password" aria-label="Show password">◉</button></div></div>
      <div class="rules" id="rules" hidden><p class="rules-title">Password requirements</p><ul id="ruleList"></ul></div>
      <div class="field"><label for="passwordAgain">Confirm password</label><div class="input-wrap"><input id="passwordAgain" type="password" placeholder="Confirm your password" autocomplete="new-password" required><button type="button" class="eye" data-for="passwordAgain" aria-label="Show confirmed password">◉</button></div></div>
      <p class="demo-hint">This is a demo. Use a made-up password. Your answers stay in this tab until the final memory check.</p>
      <p class="form-notice" aria-live="polite"></p><button class="button button-primary full" type="submit">Create account</button>
    </form>`);
  attachEyes();
  const form = panel.querySelector('#signupForm');
  const email = panel.querySelector('#email');
  const emailAgain = panel.querySelector('#emailAgain');
  const password = panel.querySelector('#password');
  const passwordAgain = panel.querySelector('#passwordAgain');
  blockPaste(emailAgain); blockPaste(passwordAgain);
  blockCopy(email); blockCopy(password);
  const updateRules = () => {
    panel.querySelectorAll('#ruleList li').forEach(row => {
      const rule = passwordRules[Number(row.dataset.rule)];
      const met = rule.test(password.value);
      row.classList.toggle('met',met);
      row.setAttribute('aria-label',`${met ? 'Met' : 'Not met'}: ${rule.text}`);
    });
  };
  const revealThrough = count => {
    const list = panel.querySelector('#ruleList');
    for (let index=visibleRuleCount; index<count; index++) {
      const row = document.createElement('li');
      row.dataset.rule = String(index);
      row.textContent = passwordRules[index].text;
      list.append(row);
    }
    visibleRuleCount = count;
    panel.querySelector('#rules').hidden = false;
    updateRules();
  };
  password.addEventListener('input', () => {
    if (passwordAgain.value) { passwordAgain.value=''; notice('Please confirm your updated password.','info'); }
    updateRules();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const address = email.value.trim();
    if (!email.validity.valid || !address.includes('.')) return notice('Enter a valid email address to continue.');
    if (address.toLowerCase() !== emailAgain.value.trim().toLowerCase()) return notice('The email addresses do not match.');
    if (!password.value) return notice('Enter a password to continue.');
    if (password.value !== passwordAgain.value) return notice('The passwords do not match. Please type it again.');

    const previousRuleCount = visibleRuleCount;
    if (visibleRuleCount === 0) revealThrough(initialRuleCount);

    // Keep revealing rules the current password already satisfies in this one attempt.
    // Stop at the first new requirement that actually needs a change.
    let unmet = passwordRules.slice(0,visibleRuleCount).find(rule => !rule.test(password.value));
    while (!unmet && visibleRuleCount < passwordRules.length) {
      revealThrough(visibleRuleCount + 1);
      const newestRule = passwordRules[visibleRuleCount - 1];
      if (!newestRule.test(password.value)) unmet = newestRule;
    }
    if (unmet) {
      if (visibleRuleCount > previousRuleCount) {
        passwordAgain.value = '';
        notice(`${unmet.text} Please confirm your password again.`, 'info');
      } else {
        notice(unmet.text);
      }
      password.focus();
      return;
    }
    enteredDetails = {email:address.toLowerCase(), password:password.value};
    form.reset();
    moveTo('captcha');
  });
}

const challenges = [
  {name:'traffic lights', detail:'Select all squares with traffic lights.', answer:[0,4,7]},
  {name:'bicycles', detail:'Please complete this additional check.', answer:[1,3,6]},
  {name:'anything that is not a bus', detail:'Yes, the traffic lights count again.', answer:[0,1,3,4,6,7]},
  {name:'every single square', detail:'We just want to be absolutely certain.', answer:[0,1,2,3,4,5,6,7,8]}
];
function renderCaptcha() {
  let challengeIndex = 0;
  let chosen = new Set();
  let refreshOffset = 0;
  frame('Confirm it’s you','We just need to run a quick security check.',`
    <div class="captcha-widget">
      <button type="button" class="captcha-checkbox" id="robotCheck" aria-label="I'm not a robot" aria-haspopup="dialog" aria-expanded="false"><span class="captcha-checkbox-square" aria-hidden="true"></span><span>I'm not a robot</span></button>
      <div class="captcha-widget-brand" aria-hidden="true"><span class="captcha-widget-mark">m</span><small>mildly verify<br><span>Privacy · Terms</span></small></div>
    </div>
    <p class="captcha-under-note">Please complete verification to continue.</p>`);
  const checkbox = panel.querySelector('#robotCheck');
  const dialog = document.createElement('dialog');
  dialog.id = 'captchaDialog';
  dialog.className = 'captcha-dialog';
  document.body.append(dialog);
  dialog.addEventListener('close', () => checkbox.setAttribute('aria-expanded','false'));
  checkbox.addEventListener('click', () => {
    checkbox.setAttribute('aria-expanded','true');
    paint();
    dialog.showModal();
  });
  function paint(message = '') {
    const current = challenges[challengeIndex];
    dialog.innerHTML = `
      <div class="captcha-dialog-header"><span>Select all images with</span><strong>${current.name}</strong><small>${current.detail}</small></div>
      <div class="captcha-dialog-body"><div class="captcha-grid" role="group" aria-label="Image challenge">${Array.from({length:9},(_,index)=>{
        const photo=(index+refreshOffset)%9;
        return `<button type="button" class="tile" data-tile="${index}" data-photo="${photo}" aria-label="Image ${index+1}" aria-pressed="false" style="background-position:${(photo%3)*50}% ${Math.floor(photo/3)*50}%"></button>`;
      }).join('')}</div><p class="captcha-message" role="status" aria-live="polite">${message}</p></div>
      <div class="captcha-dialog-footer"><div class="captcha-dialog-tools"><button type="button" id="refreshChallenge" aria-label="Get a new image layout" title="Get a new layout">↻</button><button type="button" id="challengeHelp" aria-label="Challenge help" title="Help">?</button></div><button type="button" class="captcha-verify" id="verify">VERIFY</button></div>`;
    dialog.querySelectorAll('.tile').forEach(tile => tile.addEventListener('click', () => {
      const index=Number(tile.dataset.tile);
      chosen.has(index) ? chosen.delete(index) : chosen.add(index);
      tile.classList.toggle('selected',chosen.has(index));
      tile.setAttribute('aria-pressed',String(chosen.has(index)));
    }));
    dialog.querySelector('#refreshChallenge').addEventListener('click', () => {chosen.clear();refreshOffset=(refreshOffset+1)%9;paint('The images have been rearranged.');});
    dialog.querySelector('#challengeHelp').addEventListener('click', () => {dialog.querySelector('.captcha-message').textContent='Select every square matching the instruction above, then press VERIFY.';});
    dialog.querySelector('#verify').addEventListener('click', () => {
      const answers = [...dialog.querySelectorAll('.tile')].filter(tile=>current.answer.includes(Number(tile.dataset.photo))).map(tile=>Number(tile.dataset.tile));
      const right=answers.length===chosen.size && answers.every(index=>chosen.has(index));
      if(!right){chosen.clear();refreshOffset=(refreshOffset+1)%9;paint('That was close. Please try the new layout.');return;}
      challengeIndex++;
      refreshOffset=(refreshOffset+2)%9;
      chosen.clear();
      if(challengeIndex<challenges.length) paint('One more quick check.');
      else paintFinal();
    });
  }
  function paintFinal() {
    dialog.innerHTML=`<div class="captcha-dialog-header"><span>Verification complete</span><strong>Almost.</strong><small>There is one last confirmation.</small></div><div class="captcha-final"><div class="captcha-final-icon" aria-hidden="true">✓</div><p>Please confirm that you meant to finish verifying.</p><button type="button" class="captcha-verify" id="finalVerify">CONFIRM VERIFICATION</button></div>`;
    dialog.querySelector('#finalVerify').addEventListener('click',()=>{
      dialog.close();
      checkbox.classList.add('verified');
      checkbox.querySelector('.captcha-checkbox-square').textContent='✓';
      checkbox.querySelector('span:last-child').textContent='Verified';
      checkbox.setAttribute('aria-label','Verified');
      panel.querySelector('.captcha-under-note').textContent='Thanks. Please continue.';
      schedule(()=>moveTo('cookies'),700);
    });
  }
}
function renderCookies() {
  frame('Your privacy matters','Choose how you would like us to use cookies.',`
    <div class="cookie-box"><h3>Cookie preferences</h3><p>Necessary cookies keep the experience working. Optional cookies help us understand how visitors use the site.</p>
      <div class="button-row"><button class="button button-primary" type="button" id="acceptAll">Accept all</button><button class="link-button" type="button" id="customise">Customise settings</button></div><div id="cookieSettings" hidden></div></div>`);
  panel.querySelector('#acceptAll').addEventListener('click',()=>moveTo('notifications'));
  panel.querySelector('#customise').addEventListener('click',()=>{
    const target=panel.querySelector('#cookieSettings');
    target.hidden=false;
    target.innerHTML=`<div class="setting-list"><div class="setting-row"><span><strong>Essential</strong><small>Always active</small></span><button type="button" class="switch" aria-label="Essential cookies on" aria-pressed="true" disabled></button></div><div class="setting-row"><span><strong>Analytics</strong><small>Help us improve the experience</small></span><button type="button" class="switch" aria-label="Analytics cookies" aria-pressed="true"></button></div><div class="setting-row"><span><strong>Personalisation</strong><small>Remember your preferences</small></span><button type="button" class="switch" aria-label="Personalisation cookies" aria-pressed="true"></button></div></div><button type="button" class="button button-secondary full" id="saveCookies">Save my choices</button>`;
    target.querySelectorAll('.switch:not(:disabled)').forEach(switcher=>switcher.addEventListener('click',()=>toggleSwitch(switcher)));
    target.querySelector('#saveCookies').addEventListener('click',()=>moveTo('notifications'));
    panel.querySelector('#customise').hidden=true;
  });
}
function toggleSwitch(button) {
  const wasOn=button.getAttribute('aria-pressed')==='true';
  button.setAttribute('aria-pressed',String(!wasOn));
  button.classList.toggle('off',wasOn);
}
function renderNotifications() {
  const items=[['Product updates','Be first to hear what is new.'],['Useful reminders','A little nudge when you need it.'],['Offers and tips','Occasional ideas, delivered to your inbox.']];
  frame('Make it yours','Choose the messages you would like to receive.',`
    <div class="setting-list">${items.map(([name,description],index)=>`<div class="setting-row"><span><strong>${name}</strong><small>${description}</small></span><button type="button" class="switch message-switch" data-index="${index}" aria-label="${name} on" aria-pressed="true"></button></div>`).join('')}</div>
    <p class="quiet-note" id="quietNote">Your preferences can be updated at any time.</p><p class="form-notice" aria-live="polite"></p><button type="button" class="button button-primary full" id="continueMessages">Save preferences</button>`);
  const switches=[...panel.querySelectorAll('.message-switch')];
  switches.forEach(button=>button.addEventListener('click',()=>{
    toggleSwitch(button);
    button.setAttribute('aria-label',`${items[Number(button.dataset.index)][0]} ${button.getAttribute('aria-pressed')==='true'?'on':'off'}`);
    const off=switches.filter(item=>item.getAttribute('aria-pressed')==='false').length;
    if(off===3) panel.querySelector('#quietNote').textContent='All notifications are now off.';
  }));
  panel.querySelector('#continueMessages').addEventListener('click',()=>{
    if(switches.some(button=>button.getAttribute('aria-pressed')==='true')) return notice('Please review all three notification settings before continuing.');
    moveTo('terms');
  });
}
const termsChapters = [
  {title:'The introductory introduction', clauses:[
    'This is a parody demo. No account will be created, and the details you type are used only inside this browser tab for the final memory check. They are not submitted to a server or saved between visits. Reading beyond this sentence does not create a legal contract, although it may create a lasting impression.',
    'The phrase “quick setup” describes an aspiration rather than a measurable unit of time. A quick setup may include a few questions, several questions about the previous questions, and a pause in which the interface appears to consider whether the previous answers were sufficiently enthusiastic.',
    'By continuing to read, you acknowledge that a button labelled Continue may ask you to continue doing the thing you were already doing. A button labelled Final may be followed by another button with an even more final sounding label. These labels are intended for dramatic effect.',
    'If a page asks you to confirm an email address twice, the second entry is presumed to contain the same letters in roughly the same order. The site may nevertheless request a third confirmation later, after you have had enough time to forget what you typed in the first two.'
  ], mark:'I noticed the small acknowledgement in the introduction.'},
  {title:'On verification and reasonable doubt', clauses:[
    'Images used for verification may feature familiar street objects. A bicycle remains a bicycle when viewed from an inconvenient angle, a traffic light remains a traffic light while displaying amber, and a bus continues to qualify as a bus even when it looks as though it would rather be elsewhere.',
    'A completed challenge may lead to another challenge. This does not imply that the first answer was wrong. It merely means the system has found a new way to be uncertain. The next challenge may reuse the same images because acquiring new ones would have taken additional time.',
    'You are responsible for deciding whether an object appears in a tiny square. The operators of this fictional service reserve the right to ask whether the object does not appear in a square, appears in all squares, or is emotionally present despite being physically absent.',
    'The verification checkbox is a theatrical device. It cannot determine whether you are a robot, a person, or a person who has spent so long on the internet that the distinction feels increasingly academic. It can, however, open another window.'
  ], mark:'I have considered the possibility of another verification.'},
  {title:'Preferences, notices, and other small print', clauses:[
    'A preference can be described as optional while still requiring you to inspect its switch. Turning something off may require more effort than turning it on. The site apologises in advance for any feeling that the controls have a stronger preference than you do.',
    'Necessary cookies in this demo are a subject of conversation rather than a real tracking system. The choices presented are part of the joke. Any apparent urgency in the wording of the preference screen is therefore entirely cosmetic, much like the certainty of a progress bar.',
    'If you leave this page before finishing, the process may begin again when you return. This behaviour should not be interpreted as a motivational technique, although it has been observed to produce a surprising level of determination in some visitors.',
    'Occasional phrases such as “one more thing” and “almost there” are not guarantees about distance to completion. They are expressions of optimism. The site may be optimistic on your behalf even when you would prefer it to be quiet.'
  ], mark:'I found this tiny line among the preferences.'},
  {title:'Progress, waiting, and confirmation', clauses:[
    'Progress indicators can accelerate, decelerate, pause, and resume without providing a reliable measure of work. A percentage reflects what the interface currently wishes to communicate. It does not necessarily correspond to the amount of patience still required.',
    'A request for confirmation may itself be followed by a request to confirm that confirmation. This sequence is considered a normal part of the demo. You may wonder whether the system heard you the first time. It did. It simply enjoys hearing you say it again.',
    'Waiting periods are measured according to the clock in your current device. Staring at the number will not make it increase faster. Looking away may create the impression that it moved while you were not watching, which is a perfectly acceptable way to experience this page.',
    'At some point, you may be asked to recall information you entered earlier. This is intended as a memory quiz, not a security feature. Please use a made-up password, and do not use a password from an account you actually care about.'
  ], mark:'I acknowledge that a percentage can have feelings.'},
  {title:'The concluding conclusion', clauses:[
    'The word final, when used in a heading, is a stylistic flourish. A final step can contain several smaller steps. A final confirmation can have a final confirmation of its own. The visitor should interpret such language generously and avoid making appointments based on it.',
    'If you locate every small acknowledgement in this document, scroll through the remaining text, remember your made-up details, and finish the process, you may receive a digital trophy. The trophy has no monetary value, though the patience it represents may feel expensive.',
    'The trophy may be admired, celebrated, or shown to someone who has not yet attempted this process. It is not transferable to another tab. Refreshing the page may cause the trophy to disappear, but the memory of reaching it should remain available without an internet connection.',
    'This is the end of the demo terms. There is no hidden clause after this paragraph. Please take a moment to appreciate that this sentence is, for once, exactly as final as it sounds.'
  ]}
];
function renderTerms() {
  const chapters = termsChapters.map((chapter, chapterIndex) => `<section class="terms-chapter">
    <h4>${chapter.title}</h4>${chapter.clauses.map((clause,index)=>`<p><span class="clause-number">${chapterIndex*4+index+1}.</span> ${clause}</p>`).join('')}
    ${chapter.mark ? `<label class="terms-tiny-check"><input type="checkbox" class="terms-mark" aria-label="${chapter.mark}"><span>${chapter.mark}</span></label>` : ''}
  </section>`).join('');
  frame('One final review','Read carefully. Some of the small print wants an answer.',`
    <div class="terms-topline"><span>TERMS OF USE</span><span>Scroll to read</span></div>
    <div class="terms-box" id="terms" tabindex="0" aria-label="Demo terms. Scroll through each section and tick the small acknowledgements.">
      <h3>Terms of use</h3><p class="terms-effective">Effective whenever you opened this page · Demo edition</p>${chapters}
    </div>
    <label class="check-row locked" id="agreementRow"><input id="agreement" type="checkbox" disabled> I have read and agree to the demo terms.</label>
    <p class="form-notice" aria-live="polite"></p><button type="button" class="button button-primary full" id="termsContinue">Continue</button>`);
  const terms = panel.querySelector('#terms');
  const marks = [...panel.querySelectorAll('.terms-mark')];
  const agreement = panel.querySelector('#agreement');
  marks.slice(1).forEach(mark=>mark.disabled=true);
  const updateScroll = () => {
    const nextMark = marks.find(mark=>!mark.checked);
    if (nextMark) {
      const markPosition = nextMark.getBoundingClientRect().top - terms.getBoundingClientRect().top + terms.scrollTop;
      const scrollLimit = Math.max(0, markPosition - terms.clientHeight + 100);
      if (terms.scrollTop > scrollLimit + 1) terms.scrollTop = scrollLimit;
      return;
    }
    if (terms.scrollTop + terms.clientHeight >= terms.scrollHeight - 8) {
      agreement.disabled = false;
      panel.querySelector('#agreementRow').classList.remove('locked');
    }
  };
  marks.forEach((mark,index)=>mark.addEventListener('change',()=>{
    mark.closest('.terms-tiny-check').classList.toggle('acknowledged',mark.checked);
    if (marks[index+1]) marks[index+1].disabled = !mark.checked;
    updateScroll();
  }));
  terms.addEventListener('scroll',updateScroll);
  updateScroll();
  panel.querySelector('#termsContinue').addEventListener('click',()=>{
    if(marks.some(mark=>!mark.checked)) return notice('A few tiny acknowledgements are still waiting inside the terms.');
    if(agreement.disabled) return notice('Please scroll through the final section.');
    if(!agreement.checked) return notice('Please tick the agreement box.');
    moveTo('waiting');
  });
}
function renderWaiting() {
  frame('Setting things up','We are getting everything ready for you.',`
    <div class="loading-scene"><div class="loading-kicker">ACCOUNT SETUP</div><div class="loading-number" id="loadNumber">0%</div>
    <div class="loading-track" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loading-fill" id="loadFill"></div></div>
    <p class="loading-caption" id="loadCaption" aria-live="polite">Carefully getting started...</p><div class="loading-dots" aria-hidden="true"><i></i><i></i><i></i></div></div>`);
  const dialog = document.createElement('dialog');
  dialog.id = 'certaintyDialog';
  dialog.className = 'certainty-dialog';
  dialog.addEventListener('cancel',event=>event.preventDefault());
  document.body.append(dialog);
  const setProgress = value => {
    panel.querySelector('#loadNumber').textContent = `${value}%`;
    panel.querySelector('#loadFill').style.width = `${value}%`;
    panel.querySelector('.loading-track').setAttribute('aria-valuenow',String(value));
  };
  const confirmations = [
    {eyebrow:'A QUICK CONFIRMATION', title:'Are you sure you want to finish?', body:'Everything is ready. We just need to make sure you mean it.', button:'Yes, I’m sure'},
    {eyebrow:'CONFIRMATION OF CONFIRMATION', title:'Are you sure you’re sure?', body:'We received your answer. Please confirm the answer to the confirmation.', button:'I’m still sure'},
    {eyebrow:'A MOMENT LATER', title:'Still sure?', body:'We gave you a little time to reconsider. Your previous confirmations remain on file for this tab only.', button:'Yes. Finish it.'}
  ];
  function ask(index) {
    if (scene !== 'waiting') return;
    const item = confirmations[index];
    dialog.innerHTML = `<span class="certainty-eyebrow">${item.eyebrow}</span><div class="certainty-icon" aria-hidden="true">?</div><h3>${item.title}</h3><p>${item.body}</p><button type="button" class="button button-primary full" id="certaintyYes">${item.button}</button>`;
    dialog.showModal();
    dialog.querySelector('#certaintyYes').addEventListener('click',()=>{
      dialog.close();
      if(index===0) schedule(()=>ask(1),350);
      else if(index===1){panel.querySelector('#loadCaption').textContent='Giving that answer a moment to settle...';schedule(()=>ask(2),2600);}
      else {setProgress(100);panel.querySelector('#loadCaption').textContent='Finally complete. Almost.';schedule(()=>moveTo('quiz'),850);}
    });
  }
  const phases = [
    {duration:6200, start:0, end:23, caption:'Carefully getting started...'},
    {duration:1700, start:23, end:82, caption:'Oh, now we’re moving.'},
    {duration:7900, start:82, end:99, caption:'Just one last tiny thing...'}
  ];
  const total = phases.reduce((sum,phase)=>sum+phase.duration,0);
  const started = performance.now();
  waitTimer = setInterval(()=>{
    if(scene!=='waiting'){clearInterval(waitTimer);return;}
    let elapsed = Math.min(performance.now()-started,total);
    for(const phase of phases){
      if(elapsed<=phase.duration){
        setProgress(Math.round(phase.start+(phase.end-phase.start)*elapsed/phase.duration));
        panel.querySelector('#loadCaption').textContent=phase.caption;
        break;
      }
      elapsed-=phase.duration;
    }
    if(performance.now()-started>=total){
      clearInterval(waitTimer);
      setProgress(99);
      panel.querySelector('#loadCaption').textContent='Waiting for your final confirmation...';
      schedule(()=>ask(0),450);
    }
  },90);
}
function renderQuiz() {
  if(!enteredDetails) return moveTo('signup');
  frame('A quick memory check','You entered these details a while ago. Do you still remember them?',`
    <div class="quiz-badge"><span aria-hidden="true">✦</span> THE ACTUAL FINAL STEP</div>
    <form id="quizForm" novalidate>
      <div class="field"><label for="rememberedEmail">The email address you used</label><input id="rememberedEmail" type="email" placeholder="From memory, please" autocomplete="off" required></div>
      <div class="field"><label for="rememberedPassword">Your made-up password</label><div class="input-wrap"><input id="rememberedPassword" type="password" placeholder="No peeking" autocomplete="off" required><button type="button" class="eye" data-for="rememberedPassword" aria-label="Show remembered password">◉</button></div></div>
      <p class="quiz-hint">Paste is unavailable, naturally. Your answer stays in this tab and is cleared when you finish.</p>
      <p class="form-notice" aria-live="polite"></p><button class="button button-primary full" type="submit">Claim my reward</button>
    </form>`);
  attachEyes();
  const email = panel.querySelector('#rememberedEmail');
  const password = panel.querySelector('#rememberedPassword');
  blockPaste(email);
  blockPaste(password);
  panel.querySelector('#quizForm').addEventListener('submit',event=>{
    event.preventDefault();
    if(email.value.trim().toLowerCase()!==enteredDetails.email || password.value!==enteredDetails.password){
      password.value='';
      notice('Not quite. Think back to what you entered at the start.');
      password.focus();
      return;
    }
    enteredDetails=null;
    moveTo('success');
  });
}
function renderSuccess() {
  frame('The Trophy of Patience','You made it through every last check.',`
    <div class="trophy-stage"><div class="trophy-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="trophy-halo"><svg class="trophy-art" viewBox="0 0 240 240" role="img" aria-label="Golden trophy">
        <defs><linearGradient id="goldCup" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1aa"/><stop offset=".38" stop-color="#f6bd49"/><stop offset=".72" stop-color="#d78920"/><stop offset="1" stop-color="#ffe383"/></linearGradient><linearGradient id="goldBase" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#aa6322"/><stop offset=".5" stop-color="#f8d276"/><stop offset="1" stop-color="#a7631e"/></linearGradient></defs>
        <path d="M65 52H37v24c0 28 17 47 47 48M175 52h28v24c0 28-17 47-47 48" fill="none" stroke="#e5a738" stroke-width="13" stroke-linecap="round"/>
        <path d="M66 43h108v49c0 43-22 72-54 72S66 135 66 92V43Z" fill="url(#goldCup)" stroke="#c18426" stroke-width="3"/>
        <path d="M83 55h20c-12 24-12 54-2 84-15-11-18-37-18-57V55Z" fill="#fff6bd" opacity=".55"/>
        <path d="m120 73 7 15 17 2-12 12 3 17-15-8-15 8 3-17-12-12 17-2 7-15Z" fill="#fff6cf" stroke="#e4a237" stroke-width="2"/>
        <path d="M112 162h16v25h-16z" fill="url(#goldBase)"/><path d="M91 184h58v12H91zM78 196h84v17H78z" fill="url(#goldBase)" stroke="#a66a27" stroke-width="2"/>
        <path d="M102 202h36v8h-36z" fill="#7b4a20" opacity=".7"/>
      </svg></div><p class="trophy-overline">OFFICIALLY AWARDED</p><h3>For extraordinary persistence</h3>
      <p class="trophy-description">You survived the password rules, the tiny pictures, the tiny terms, and the final final confirmation.</p>
      <div class="trophy-stamp">PATIENCE LEVEL: LEGENDARY <span aria-hidden="true">✦</span></div>
    </div><p class="summary">No account was created. Your made-up details have been cleared from this tab. The trophy, however, is yours to admire.</p>
    <button type="button" class="button button-primary full" id="startAgain">Try the whole thing again</button>`);
  panel.querySelector('#startAgain').addEventListener('click',()=>moveTo('signup'));
}
function renderLogin() {
  frame('Welcome back','Sign in to continue.',`
    <form id="loginForm"><div class="field"><label for="loginEmail">Email address</label><input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="off" required></div><div class="field"><label for="loginPassword">Password</label><input type="password" id="loginPassword" placeholder="Your password" autocomplete="off" required></div><p class="form-notice" aria-live="polite"></p><button class="button button-primary full" type="submit">Log in</button></form><p class="helper">New here? <button type="button" class="link-button" id="backToSignup">Create an account</button></p>`);
  panel.querySelector('#loginForm').addEventListener('submit',event=>{event.preventDefault();notice('There is no account to log in to. This is a demo.');});
  panel.querySelector('#backToSignup').addEventListener('click',()=>moveTo('signup'));
}
function render() {
  ({signup:renderSignup,captcha:renderCaptcha,cookies:renderCookies,notifications:renderNotifications,terms:renderTerms,waiting:renderWaiting,quiz:renderQuiz,success:renderSuccess,login:renderLogin})[scene]();
}
const dialog=document.querySelector('#infoDialog');
for(const id of ['helpButton','footerHelp']) document.getElementById(id).addEventListener('click',()=>dialog.showModal());
for(const id of ['closeDialog','dialogOkay']) document.getElementById(id).addEventListener('click',()=>dialog.close());
document.querySelector('#loginButton').addEventListener('click',()=>moveTo('login'));
render();
