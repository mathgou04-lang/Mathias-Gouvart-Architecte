(() => {
  'use strict';

  const form = document.querySelector('#contact-form');
  if (!(form instanceof HTMLFormElement)) return;

  const button = form.querySelector('[data-contact-submit]');
  const buttonLabel = button && button.querySelector('[data-contact-submit-label]');
  const status = document.querySelector('#contact-status');
  const fieldIds = [
    'contact-name',
    'contact-email',
    'contact-phone',
    'contact-type',
    'contact-location',
    'contact-message',
  ];
  const fields = fieldIds.map((id) => ({
    input: form.querySelector(`#${id}`),
    error: document.getElementById(`${id}-error`),
  }));

  // Leave browser validation enabled if the expected enhancement is incomplete.
  if (!button || !buttonLabel || !status || fields.some(({ input, error }) => !input || !error)) return;

  const originalLabel = buttonLabel.textContent;
  const originallyDisabled = button.disabled;
  const originalBusy = form.getAttribute('aria-busy');
  let submitting = false;
  let focusingInvalid = false;
  let statusKind = '';

  function setStatus(message, kind = '') {
    status.textContent = message;
    statusKind = kind;
  }

  function setError(field, message = '') {
    field.error.textContent = message;
    field.error.hidden = !message;
    if (message) field.input.setAttribute('aria-invalid', 'true');
    else field.input.removeAttribute('aria-invalid');
  }

  function setBusy(busy) {
    submitting = busy;
    button.disabled = busy || originallyDisabled;
    buttonLabel.textContent = busy ? 'Envoi en cours…' : originalLabel;
    if (busy) form.setAttribute('aria-busy', 'true');
    else if (originalBusy === null) form.removeAttribute('aria-busy');
    else form.setAttribute('aria-busy', originalBusy);
  }

  function validationMessage(input) {
    const value = input.value.trim();
    const maximum = input.maxLength;

    if (input.id === 'contact-name') {
      if (!value) return 'Indiquez votre nom.';
      if (maximum > 0 && value.length > maximum) return `Limitez votre nom à ${maximum} caractères.`;
    }

    if (input.id === 'contact-email') {
      if (!value) return 'Indiquez votre adresse e-mail.';
      if (input.validity.typeMismatch) return 'Indiquez une adresse e-mail valide, par exemple nom@exemple.be.';
      if (maximum > 0 && value.length > maximum) return `Limitez votre adresse e-mail à ${maximum} caractères.`;
    }

    if (input.id === 'contact-type') {
      const selected = input.selectedOptions && input.selectedOptions[0];
      if (!value || !selected || selected.disabled) return 'Choisissez le type de votre projet.';
    }

    if (input.id === 'contact-message') {
      if (!value) return 'Décrivez votre projet en quelques mots.';
      const minimum = input.minLength > 0 ? input.minLength : 10;
      if (value.length < minimum) return `Ajoutez quelques précisions : votre message doit contenir au moins ${minimum} caractères.`;
      if (maximum > 0 && value.length > maximum) return `Limitez votre message à ${maximum} caractères.`;
    }

    // Respect any additional constraints supplied by the HTML, including those
    // on optional fields, without imposing a phone format or a location.
    if (input.validity.valueMissing) return 'Complétez ce champ.';
    if (input.validity.tooLong || (maximum > 0 && value.length > maximum)) return `Limitez ce champ à ${maximum} caractères.`;
    if (input.validity.patternMismatch || input.validity.typeMismatch || input.validity.badInput) {
      return input.id === 'contact-phone'
        ? 'Vérifiez le numéro de téléphone indiqué.'
        : 'Vérifiez les informations indiquées dans ce champ.';
    }
    if (!input.validity.valid) return 'Vérifiez les informations indiquées dans ce champ.';
    return '';
  }

  fields.forEach((field) => {
    const clearError = () => {
      // Moving focus after validation can itself fire a pending change event.
      if (focusingInvalid) return;
      setError(field);
      if (statusKind === 'validation') setStatus('');
    };
    field.input.addEventListener('input', clearError);
    field.input.addEventListener('change', clearError);
  });

  form.addEventListener('submit', (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }
    if (event.defaultPrevented) return;

    let firstInvalid = null;
    fields.forEach((field) => {
      const message = validationMessage(field.input);
      setError(field, message);
      if (message && !firstInvalid) firstInvalid = field.input;
    });

    if (firstInvalid) {
      event.preventDefault();
      setStatus('Merci de corriger les champs indiqués avant d’envoyer votre demande.', 'validation');
      focusingInvalid = true;
      try { firstInvalid.focus(); }
      finally { focusingInvalid = false; }
      return;
    }

    setBusy(true);
    setStatus('Envoi en cours…', 'sending');
    // Do not prevent this valid submission: the browser performs the real POST
    // using the action, method, fields and spam protection defined in the HTML.
  });

  window.addEventListener('pageshow', () => {
    setBusy(false);
    if (statusKind === 'sending') setStatus('');
  });

  // Enable custom validation only after every required handler is installed.
  // Without JavaScript the form keeps its native HTML validation and POST.
  form.noValidate = true;
})();
