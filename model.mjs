import { MultinomialNB } from 'ml-naivebayes';
import { getDomain, parse } from 'tldts';
import { training } from './data.mjs';

export function tokenize(text) { return text.toLowerCase().match(/[a-z]{2,32}/g) || []; }
export function trainClassifier(rows = training) {
  const vocabulary = [...new Set(rows.flatMap(row => tokenize(row.text)))].sort();
  const index = new Map(vocabulary.map((word, i) => [word, i]));
  const vector = text => {
    const counts = Array(vocabulary.length).fill(0);
    for (const word of tokenize(text)) if (index.has(word)) counts[index.get(word)]++;
    return counts;
  };
  const classifier = new MultinomialNB();
  classifier.train(rows.map(row => vector(row.text)), rows.map(row => row.label));
  return { vocabulary, classify(text) {
    const counts = vector(text);
    const recognized = counts.reduce((sum, count) => sum + count, 0);
    const rawLabel = classifier.predict([counts])[0];
    const evidence = vocabulary.map((word, i) => ({ word, count: counts[i],
      weight: classifier.conditionalProbability.get(1, i) - classifier.conditionalProbability.get(0, i) }))
      .filter(row => row.count > 0).sort((a, b) => b.weight * b.count - a.weight * a.count);
    return { rawLabel, label: recognized < 3 ? 'insufficient_evidence' : rawLabel ? 'suspicious_pattern' : 'ordinary_pattern',
      recognized, tokenCount: tokenize(text).length,
      indicators: evidence.filter(row => row.weight > 0).slice(0, 6).map(({ word, count, weight }) => ({ word, count, weight: Number(weight.toFixed(3)) })) };
  } };
}
const model = trainClassifier();
const boundary = host => getDomain(host, { allowPrivateDomains: true }) || host;
function expectedHost(value) {
  if (!value.trim()) return null;
  if (!/^[a-zA-Z0-9.-]+$/.test(value.trim())) throw new Error('Enter a hostname only, without a path or protocol.');
  const host = new URL(`https://${value.trim()}`).hostname.replace(/\.$/, '');
  const labels = host.split('.');
  if (labels.length < 2 || host.length > 253 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error('Enter a complete valid expected hostname.');
  }
  return host;
}
export function inspect(message, trusted = '') {
  if (typeof message !== 'string' || !message.trim() || message.length > 12000) throw new Error('Enter a message between 1 and 12,000 characters.');
  if (typeof trusted !== 'string') throw new Error('Invalid expected hostname.');
  const host = expectedHost(trusted);
  const linkPattern = /https?:\/\/[^\s<>"']+/gi;
  const matches = message.match(linkPattern) || [];
  if (matches.length > 20) throw new Error('Inspect at most 20 links at once.');
  const links = matches.map(raw => {
    try {
      const url = new URL(raw.replace(/[),.;!?]+$/, ''));
      const notes = [];
      if (url.username || url.password) notes.push('Embedded credentials can hide the destination.');
      if (url.protocol === 'http:') notes.push('This link does not use HTTPS.');
      if (parse(url.hostname).isIp) notes.push('Destination is an IP address rather than a named organization.');
      if (url.hostname.includes('xn--')) notes.push('Internationalized hostname: inspect possible visual lookalikes.');
      if (host && boundary(url.hostname) !== boundary(host)) notes.push('Destination domain differs from the expected domain.');
      return { hostname: url.hostname, domain: boundary(url.hostname), notes,
        expectedDomainMatch: host ? boundary(url.hostname) === boundary(host) : null };
    } catch { return { hostname: 'Unparseable link', domain: null, notes: ['Could not parse this destination.'], expectedDomainMatch: false }; }
  });
  // URL credentials and query tokens must not become exported language indicators.
  const classification = model.classify(message.replace(linkPattern, ' '));
  return { ...classification, links, expectedHostname: host,
    recommendation: links.some(row => row.notes.length) || classification.label !== 'ordinary_pattern'
      ? 'Pause and verify through a known app, bookmark, or independently obtained phone number.'
      : 'No suspicious language pattern identified by this small model. Independently verify any sensitive request.',
    model: 'Multinomial Naive Bayes / 40 synthetic training messages',
    limitations: 'English-only prototype. Labels are not fraud determinations. Synthetic training and evaluation cannot establish real-world accuracy. URLs are parsed, never opened.' };
}
