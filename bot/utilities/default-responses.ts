export const CommandFamilies = {
    socials: 'socials',
} as const;

export const transientKeywords = {
    broadcaster: 'broadcaster',
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
    when: 'when',
    duration: 'duration',
    link: 'link',
    item: 'item',
    dice: 'dice',
    rolls: 'rolls',
    total: 'total',
    raider: 'raider',
    viewercount: 'viewercount',
    subscriber: 'subscriber',
    gifter: 'gifter',
    giftcount: 'giftcount',
    users: 'users',
    lastuser: 'lastuser',
};

export type TransientKeyword = keyof typeof transientKeywords;
export type TransientContext = Partial<Record<TransientKeyword, string>>;
