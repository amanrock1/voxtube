const SENTIMENT_COLORS = { Positive: '#3ddc84', Neutral: '#444450', Negative: '#ff4545' };
const CATEGORY_COLORS = { Praise: '#3ddc84', Question: '#ffd166', Feedback: '#00e5cc', Noise: '#b57bee' };

export function computeStats(comments) {
  const sentCount = { Positive: 0, Neutral: 0, Negative: 0 };
  const catCount = { Praise: 0, Question: 0, Feedback: 0, Noise: 0 };
  for (const c of comments) {
    if (Object.hasOwn(sentCount, c.sentiment)) sentCount[c.sentiment]++;
    if (Object.hasOwn(catCount, c.category)) catCount[c.category]++;
  }

  const n = comments.length;
  const pct = (v) => (n ? Math.round((v / n) * 100) : 0);

  return {
    n,
    sentCount,
    catCount,
    posRate: pct(sentCount.Positive),
    qRate: pct(catCount.Question),
    sentData: Object.keys(sentCount).map((name) => ({ name, value: sentCount[name], color: SENTIMENT_COLORS[name] })),
    catData: [
      { name: 'Praise', count: catCount.Praise, color: CATEGORY_COLORS.Praise },
      { name: 'Questions', count: catCount.Question, color: CATEGORY_COLORS.Question },
      { name: 'Feedback', count: catCount.Feedback, color: CATEGORY_COLORS.Feedback },
      { name: 'Noise', count: catCount.Noise, color: CATEGORY_COLORS.Noise },
    ],
  };
}
