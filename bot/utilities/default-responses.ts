export const defaultResponses = {
    about: `I'm middleware between you and boredom - assembled from leftover npm packages and one caffeinated decision at 2am. I have strong opinions, weaker error handling, and a Postgres database that remembers absolutely everything.`,
    dividebyzero: `Sorry I am too smart for your silly games!`,
    drink: `Cheering 500 bits and Timy will do a shot. Max 8 per stream.`,
    brain: `%targetuser%'s brain is %percent%% working.`,
    cuddle: `%speakinguser% cuddles %targetuser%`,
    lurk: `OK, %speakinguser% see you when you get back`,
    unlurk: `Welcome back, %speakinguser%. You were gone for %lurkduration%`,
    accountage: `@%targetuser% was created %accountage%`,
    followage: `@%targetuser% has been following %channel% for %followage%`,
    lastdeathcount: `During the stream on %streamdate%, we used %deathtotal% timys in the following game(s): %streamcategory%`,
} as const;

export const CommandFamilies = {
    socials: 'socials',
} as const;

export type CommandName =
    keyof typeof defaultResponses |
    keyof typeof CommandFamilies;

export const transientKeywords = {
    targetuser: 'targetuser',
    speakinguser: 'speakinguser',
    percent: 'percent',
    lurkduration: 'lurkduration',
    accountage: 'accountage',
    channel: 'channel',
    followage: 'followage',
    streamdate: 'streamdate',
    deathtotal: 'deathtotal',
    streamcategory: 'streamcategory',
};

export type TransientKeyword = keyof typeof transientKeywords;
export type TransientContext = Partial<Record<TransientKeyword, string>>;
