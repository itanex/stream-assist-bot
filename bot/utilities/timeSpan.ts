/* eslint-disable no-return-assign */
/* eslint-disable no-underscore-dangle */
export default class Timespan {
    constructor(
        /** Internal. Used to track base time for span */
        private _milliseconds: number = 0,
    ) { }

    /**
     * Calculates a new timespan by finding the difference between
     * `Now` and the provided `Then` value. Determines the most current
     * time instead of a Math.absolute solution
     */
    public static fromNow(then: Date): Timespan {
        const now = new Date();

        return new Timespan(
            now > then
                ? now.getTime() - then.getTime()
                : then.getTime() - now.getTime(),
        );
    }

    public get milliseconds(): number {
        return this._milliseconds - this.totalSeconds * 1000;
    }

    public get totalMilliseconds(): number {
        return this._milliseconds;
    }

    private _seconds: number | null = null;
    public get seconds(): number {
        return this._seconds || (this._seconds = Math.floor(this.totalSeconds / 1000));
    }

    private _totalSeconds: number | null = null;
    public get totalSeconds(): number {
        return this._totalSeconds || (this._totalSeconds = Math.floor(this.totalMilliseconds / 1000));
    }

    private _minutes: number | null = null;
    public get minutes(): number {
        return this._minutes || (this._minutes = Math.floor(this.totalMinutes % 60));
    }

    private _totalMinutes: number | null = null;
    public get totalMinutes(): number {
        return this._totalMinutes || (this._totalMinutes = Math.floor(this.totalSeconds / 60));
    }

    private _hours: number | null = null;
    public get hours(): number {
        return this._hours || (this._hours = Math.floor(this.totalHours % 24));
    }

    private _totalHours: number | null = null;
    public get totalHours(): number {
        return this._totalHours || (this._totalHours = Math.floor(this.totalMinutes / 60));
    }

    private _days: number | null = null;
    public get days(): number {
        return this._days || (this._days = Math.floor((this.totalDays % 365.25) % 30.437));
    }

    private _totalDays: number | null = null;
    public get totalDays(): number {
        return this._totalDays || (this._totalDays = Math.floor(this.totalHours / 24));
    }

    private _months: number | null = null;
    public get months(): number {
        return this._months || (this._months = Math.floor((this.totalDays % 365.25) / 30.437));
    }

    private _years: number | null = null;
    public get years(): number {
        return this._years || (this._years = Math.floor(this.totalDays / 365.25));
    }
}

export function getAgeReport(timespan: Timespan) {
    const result: string[] = [];

    if (timespan.years) {
        result.push(timespan.years === 1
            ? `${timespan.years} year`
            : `${timespan.years} years`);
    }

    if (timespan.months) {
        result.push(timespan.months === 1
            ? `${timespan.months} month`
            : `${timespan.months} months`);
    }

    if (timespan.days) {
        result.push(timespan.days === 1
            ? `${timespan.days} day`
            : `${timespan.days} days`);
    }

    if (timespan.hours) {
        result.push(timespan.hours === 1
            ? `${timespan.hours} hour`
            : `${timespan.hours} hours`);
    }

    if (timespan.minutes && !timespan.years && !timespan.months) {
        result.push(timespan.minutes === 1
            ? `${timespan.minutes} minute`
            : `${timespan.minutes} minutes`);
    }

    return result.join(' ');
}
