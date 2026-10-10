const panel = document.querySelector('#panel');
const toast = document.querySelector('#toast');
let scene = 'signup';
let visibleRuleCount = 0;
let toastTimer;
let waitTimer;

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
  render();
  if (window.innerWidth < 761) document.querySelector('.form-section').scrollIntoView({behavior:'smooth',block:'start'});
}
function frame(title, subtitle, body) {
  panel.innerHTML = `<h2>${title}</h2><p class="subtitle">${subtitle}</p>${body}`;
}
function attachEyes() {
  panel.querySelectorAll('.eye').forEach(button => button.addEventListener('click', () => {
    const input = panel.querySelector(`#${button.dataset.for}`);
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    button.setAttribute('aria-label', `${visible ? 'Show' : 'Hide'} ${button.dataset.for === 'password' ? 'password' : 'confirmed password'}`);
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
      <p class="demo-hint">This is a demo. Use a made-up password; nothing is sent or saved.</p>
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
    passwordAgain.value = '';
    notice('There is one more thing. Please confirm your password again.','info');
    password.focus();
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

    if (visibleRuleCount === 0) {
      revealThrough(initialRuleCount);
      return;
    }
    const unmet = passwordRules.slice(0,visibleRuleCount).find(rule => !rule.test(password.value));
    if (unmet) {
      notice(unmet.text);
      password.focus();
      return;
    }
    if (visibleRuleCount < passwordRules.length) {
      revealThrough(visibleRuleCount+1);
      return;
    }
    form.reset();
    moveTo('captcha');
  });
}

const challenges = [
  {name:'traffic lights', icons:['🚦','🚗','🌳','🏠','🚦','🚌','🚲','🚦','☁️'], answer:[0,4,7]},
  {name:'bicycles', icons:['🚗','🚲','🌳','🚲','🚦','🏠','☁️','🚲','🚌'], answer:[1,3,7]}
];
function renderCaptcha() {
  let challengeIndex = 0;
  let chosen = new Set();
  let refreshOffset = 0;
  function paint() {
    const current = challenges[challengeIndex];
    const icons = current.icons.map((_, index) => current.icons[(index + refreshOffset) % current.icons.length]);
    const answers = current.answer.map(index => (index - refreshOffset + current.icons.length) % current.icons.length);
    frame('Confirm it’s you','We just need to run a quick security check.',`
      <div class="captcha-intro"><span>Select all images containing</span><strong>${current.name}</strong></div>
      <div class="captcha-grid" role="group" aria-label="Image challenge">${icons.map((icon,index)=>`<button type="button" class="tile" data-tile="${index}" aria-label="Tile ${index+1}: ${icon}" aria-pressed="false">${icon}</button>`).join('')}</div>
      <div class="captcha-tools"><span>Select every matching image.</span><button type="button" class="link-button" id="refreshChallenge">Get a new layout</button></div>
      <p class="form-notice" aria-live="polite"></p><button type="button" class="button button-primary full" id="verify">Verify</button>`);
    panel.querySelectorAll('.tile').forEach(tile => tile.addEventListener('click', () => {
      const index=Number(tile.dataset.tile);
      chosen.has(index) ? chosen.delete(index) : chosen.add(index);
      tile.classList.toggle('selected',chosen.has(index));
      tile.setAttribute('aria-pressed',String(chosen.has(index)));
    }));
    panel.querySelector('#refreshChallenge').addEventListener('click', () => {chosen.clear();refreshOffset=(refreshOffset+1)%9;paint();notify('The images have been rearranged.');});
    panel.querySelector('#verify').addEventListener('click', () => {
      const right=answers.length===chosen.size && answers.every(index=>chosen.has(index));
      if(!right) return notice('Please check your selection and try again.');
      if(challengeIndex===0){challengeIndex=1;refreshOffset=0;chosen.clear();paint();notify('Please verify the updated image.');}
      else moveTo('cookies');
    });
  }
  paint();
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
function renderTerms() {
  frame('One final review','Please read and accept the terms below to continue.',`
    <div class="terms-box" id="terms" tabindex="0" aria-label="Demo terms, scroll to bottom">
      <h3>Terms of use</h3>
      <p>1. This is a demo experience. No account is created, and no information entered on this page is submitted to a server.</p>
      <p>2. You acknowledge that repeated confirmations are a familiar part of using the internet, even when you entered everything correctly the first time.</p>
      <p>3. You understand that some verification puzzles may appear to repeat themselves.</p>
      <p>4. You agree that a “quick setup” can mean many different things to many different websites.</p>
      <p>5. You accept that progress indicators, if any, are estimates and are not a reliable promise of how soon you will finish.</p>
      <p>6. You acknowledge that cookie preferences often require more attention than you intended to give them.</p>
      <p>7. The end of these demo terms is now in sight. Thank you for scrolling all the way here.</p>
    </div>
    <label class="check-row locked" id="agreementRow"><input id="agreement" type="checkbox" disabled> I have read and agree to the demo terms.</label>
    <p class="form-notice" aria-live="polite"></p><button type="button" class="button button-primary full" id="termsContinue">Continue</button>`);
  const terms=panel.querySelector('#terms');
  const check=panel.querySelector('#agreement');
  terms.addEventListener('scroll',()=>{
    if(terms.scrollTop+terms.clientHeight>=terms.scrollHeight-8){check.disabled=false;panel.querySelector('#agreementRow').classList.remove('locked');}
  });
  panel.querySelector('#termsContinue').addEventListener('click',()=>{
    if(check.disabled) return notice('Please scroll to the end of the terms.');
    if(!check.checked) return notice('Please tick the agreement box.');
    moveTo('waiting');
  });
}
function renderWaiting() {
  frame('Setting things up','We are getting everything ready for you.',`
    <div class="loading-number" id="loadNumber">0%</div><div class="loading-track" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="loading-fill" id="loadFill"></div></div><p class="loading-caption" id="loadCaption">This should only take a moment.</p><div id="waitingAction"></div>`);
  let value=0;
  waitTimer=setInterval(()=>{
    if(scene!=='waiting'){clearInterval(waitTimer);return;}
    value=Math.min(99,value+(value<70?12:value<94?4:1));
    panel.querySelector('#loadNumber').textContent=`${value}%`;
    panel.querySelector('#loadFill').style.width=`${value}%`;
    panel.querySelector('.loading-track').setAttribute('aria-valuenow',String(value));
    if(value===99){clearInterval(waitTimer);panel.querySelector('#loadCaption').textContent='Just checking one more thing…';panel.querySelector('#waitingAction').innerHTML='<button type="button" class="button button-primary full" id="confirmPresence">I’m still here</button>';panel.querySelector('#confirmPresence').addEventListener('click',()=>{panel.querySelector('#loadNumber').textContent='100%';panel.querySelector('#loadFill').style.width='100%';setTimeout(()=>moveTo('success'),500);});}
  },420);
}
function renderSuccess() {
  frame('You’re all set','Thanks for your patience. You have reached the end of the demo.',`
    <div class="success-icon" aria-hidden="true">✓</div><p class="summary">No account was created, and nothing you typed was sent anywhere. The only thing you earned is the satisfaction of finishing.</p><button type="button" class="button button-primary full" id="startAgain">Start again</button>`);
  panel.querySelector('#startAgain').addEventListener('click',()=>moveTo('signup'));
}
function renderLogin() {
  frame('Welcome back','Sign in to continue.',`
    <form id="loginForm"><div class="field"><label for="loginEmail">Email address</label><input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="off" required></div><div class="field"><label for="loginPassword">Password</label><input type="password" id="loginPassword" placeholder="Your password" autocomplete="off" required></div><p class="form-notice" aria-live="polite"></p><button class="button button-primary full" type="submit">Log in</button></form><p class="helper">New here? <button type="button" class="link-button" id="backToSignup">Create an account</button></p>`);
  panel.querySelector('#loginForm').addEventListener('submit',event=>{event.preventDefault();notice('There is no account to log in to. This is a demo.');});
  panel.querySelector('#backToSignup').addEventListener('click',()=>moveTo('signup'));
}
function render() {
  ({signup:renderSignup,captcha:renderCaptcha,cookies:renderCookies,notifications:renderNotifications,terms:renderTerms,waiting:renderWaiting,success:renderSuccess,login:renderLogin})[scene]();
}
const dialog=document.querySelector('#infoDialog');
for(const id of ['helpButton','footerHelp']) document.getElementById(id).addEventListener('click',()=>dialog.showModal());
for(const id of ['closeDialog','dialogOkay']) document.getElementById(id).addEventListener('click',()=>dialog.close());
document.querySelector('#loginButton').addEventListener('click',()=>moveTo('login'));
render();
