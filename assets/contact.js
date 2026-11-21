// Formulaire de contact de arakees.com, sans serveur.
// Reprend le champ piège de la plateforme (champ `websiteUrl`, invisible pour un humain) :
// s'il est rempli, ou si le formulaire est envoyé moins de 3 secondes après l'ouverture
// de la page, c'est un robot et rien ne part. Sinon, la messagerie du visiteur s'ouvre
// avec le message prêt. L'adresse n'est jamais écrite dans le HTML : elle est assemblée ici.
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const openedAt = Date.now();
  const to = ['contact', 'arakees.com'].join('@');

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if ((data.websiteUrl || '').trim() || Date.now() - openedAt < 3000) {
      status.textContent = 'Thank you.'; // un robot : on ne lui apprend rien, et rien n'est envoyé
      return;
    }
    const name = (data.name || '').trim(), email = (data.email || '').trim(), message = (data.message || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
      status.textContent = 'Please fill in your name, a valid email and a message of at least 10 characters.';
      return;
    }
    const body = `${message}\n\n${name}${data.company ? ' – ' + data.company.trim() : ''}\n${email}`;
    location.href = `mailto:${to}?subject=${encodeURIComponent('Arakees – message from ' + name)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Your email app is opening with your message ready. Just press send.';
  });
})();
