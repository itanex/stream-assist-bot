export const defaultPhrases = {
    about: `I'm middleware between you and boredom - assembled from leftover npm packages and one caffeinated decision at 2am. I have strong opinions, weaker error handling, and a Postgres database that remembers absolutely everything.`,
} as const;

export type PhraseKey = keyof typeof defaultPhrases;
