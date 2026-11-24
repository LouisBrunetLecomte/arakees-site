// Contact form for arakees.com, with no server.
// Honeypot field `websiteUrl` (invisible to people): if it is filled in, or the form is sent
// less than 3 seconds after the page opened, it is a bot and nothing is sent. Otherwise the
// visitor's email app opens with the message ready. The address is never in the HTML: it is built here.
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const openedAt = Date.now();
  const to = ['contact', 'arakees.com'].join('@');

  // ?plan=Pro from the "Choose …" buttons preselects the plan (only values listed in the menu)
  const plan = new URLSearchParams(location.search).get('plan');
  const select = form.elements.plan;
  if (plan && select && [...select.options].some(o => o.value === plan)) select.value = plan;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if ((data.websiteUrl || '').trim() || Date.now() - openedAt < 3000) {
      status.textContent = 'Thank you.'; // a bot: tell it nothing, send nothing
      return;
    }
    const name = (data.name || '').trim(), email = (data.email || '').trim(), message = (data.message || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
      status.textContent = 'Please fill in your name, a valid email and a message of at least 10 characters.';
      return;
    }
    const planLine = data.plan ? `Plan: ${data.plan}\n\n` : '';
    const body = `${planLine}${message}\n\n${name}${data.company ? ' – ' + data.company.trim() : ''}\n${email}`;
    const subject = 'Arakees – ' + (data.plan ? data.plan + ' plan – ' : 'message from ') + name;
    location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Your email app is opening with your message ready. Just press send.';
  });
})();
