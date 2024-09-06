import {
  CensorContext,
  RegExpMatcher,
  TextCensor,
  englishDataset,
  englishRecommendedTransformers,
} from 'obscenity';

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

const asteriskStrategy = (ctx: CensorContext) => '*'.repeat(ctx.matchLength);

export const cleanText = (text: string) => {
  const censor = new TextCensor().setStrategy(asteriskStrategy);
  const matches = matcher.getAllMatches(text);
  return censor.applyTo(text, matches);
};
