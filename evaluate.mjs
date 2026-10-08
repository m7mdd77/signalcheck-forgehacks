import { training, holdout } from './data.mjs';
import { trainClassifier } from './model.mjs';

export function evaluate() {
  const model = trainClassifier(training);
  let correct = 0, baselineCorrect = 0, abstained = 0;
  const confusion = { truePositive: 0, trueNegative: 0, falsePositive: 0, falseNegative: 0 };
  const cases = holdout.map(row => {
    const prediction = model.classify(row.text);
    const baseline = /urgent|password|prize|gift cards/i.test(row.text) ? 1 : 0;
    correct += Number(prediction.rawLabel === row.label); baselineCorrect += Number(baseline === row.label);
    abstained += Number(prediction.label === 'insufficient_evidence');
    const key = prediction.rawLabel ? row.label ? 'truePositive' : 'falsePositive' : row.label ? 'falseNegative' : 'trueNegative';
    confusion[key]++;
    return { text: row.text, expected: row.label, predicted: prediction.rawLabel, baseline, label: prediction.label };
  });
  return { dataSource: 'AUTHOR_CREATED_SYNTHETIC_ONLY', trainingCount: training.length, heldoutCount: holdout.length,
    correct, baselineCorrect, abstained, confusion, cases,
    warning: 'Small hand-written holdout; no merchant/user testing or real-world accuracy claim. Data was designed by the same author as the application.' };
}
if (process.argv[1]?.endsWith('evaluate.mjs')) console.log(JSON.stringify(evaluate(), null, 2));
