import { createIcons, ShieldCheck, ScanText, Eraser, Download } from 'lucide';
import { inspect } from '../model.mjs';
import { samples } from '../data.mjs';
const $ = id => document.getElementById(id);
const icons = () => createIcons({ icons: { ShieldCheck, ScanText, Eraser, Download } });
let current = null;
function element(tag, text) { const node = document.createElement(tag); node.textContent = text; return node; }
function resetReport() {
  current = null;
  $('report').hidden = true; $('empty').hidden = false;
  $('error').hidden = true; $('export').disabled = true;
  $('indicators').replaceChildren(); $('links').replaceChildren();
  $('label').textContent = ''; $('recommendation').textContent = ''; $('coverage').textContent = '';
}
function run() {
  $('error').hidden = true;
  try {
    current = inspect($('message').value, $('trusted').value);
    $('report').hidden = false; $('empty').hidden = true; $('export').disabled = false;
    const labels = { suspicious_pattern: 'Suspicious language pattern', ordinary_pattern: 'Ordinary language pattern', insufficient_evidence: 'Not enough familiar language' };
    $('label').textContent = labels[current.label]; $('label').className = `verdict ${current.label}`;
    $('recommendation').textContent = current.recommendation;
    $('coverage').textContent = `${current.recognized} of ${current.tokenCount} tokens recognized. Weights are learned language indicators, not calibrated fraud probabilities.`;
    $('indicators').replaceChildren();
    for (const indicator of current.indicators) {
      const li = element('li', ''); li.className = 'indicator';
      li.append(element('span', `${indicator.word} (${indicator.count})`));
      const weight = element('span', `+${indicator.weight.toFixed(2)}`); weight.className = 'indicator-weight';
      weight.title = 'Learned log-likelihood difference, not a probability';
      li.append(weight); $('indicators').append(li);
    }
    if (!current.indicators.length) $('indicators').append(element('li', 'No positive suspicious-pattern indicators.'));
    $('links').replaceChildren();
    for (const link of current.links) {
      const div = element('div', ''); div.className = 'link'; div.append(element('strong', link.hostname));
      if (link.domain) div.append(element('p', `Destination domain: ${link.domain}`));
      div.append(element('p', link.notes.join(' ') || (link.expectedDomainMatch ? 'Matches the domain you typed; this does not verify the sender.' : 'No expected hostname supplied; destination authenticity is unverified.')));
      $('links').append(div);
    }
    if (!current.links.length) $('links').append(element('p', 'No HTTP links found. Other link formats are not inspected.'));
  } catch (error) { resetReport(); $('error').textContent = error.message; $('error').hidden = false; }
}
$('inspect-form').addEventListener('submit', event => { event.preventDefault(); run(); });
$('message').addEventListener('input', resetReport);
$('trusted').addEventListener('input', resetReport);
for (const button of document.querySelectorAll('[data-example]')) button.addEventListener('click', () => { $('message').value = samples[button.dataset.example]; $('trusted').value = button.dataset.example === 'payment' ? 'example-bank.test' : ''; run(); });
$('clear').addEventListener('click', () => { $('inspect-form').reset(); resetReport(); $('message').focus(); });
$('export').addEventListener('click', () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'signalcheck-evidence.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
icons();
