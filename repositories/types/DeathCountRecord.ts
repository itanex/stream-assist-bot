import { GameCountRecord } from './GameCountRecord';

export type DeathCountRecord = {
    date: string;
    counts: GameCountRecord[];
};
