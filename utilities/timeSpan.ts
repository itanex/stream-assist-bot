export type TimespanReport = {
    years: number,
    months: number,
    days: number,
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number,
}

export function getAgeReport(timespan: TimespanReport) {
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

export default class Timespan {
    private milliseconds: number;

    public FromNow(then: Date): Timespan {
        const now = new Date();
        this.milliseconds = now > then
            ? now.getTime() - then.getTime()
            : then.getTime() - now.getTime();

        return this;
    }

    public get Milliseconds(): number {
        return this.milliseconds - this.TotalSeconds * 1000;
    }

    public get TotalMilliseconds(): number {
        return this.milliseconds;
    }

    public get Seconds(): number {
        return Math.floor(this.TotalSeconds % 60);
    }

    public get TotalSeconds(): number {
        return Math.floor(this.TotalMilliseconds / 1000);
    }

    public get Minutes(): number {
        return Math.floor(this.TotalMinutes % 60);
    }

    public get TotalMinutes(): number {
        return Math.floor(this.TotalSeconds / 60);
    }

    public get Hours(): number {
        return Math.floor(this.TotalHours % 24);
    }

    public get TotalHours(): number {
        return Math.floor(this.TotalMinutes / 60);
    }

    public get Days(): number {
        return Math.floor((this.TotalDays % 365.25) % 30.437);
    }

    public get TotalDays(): number {
        return Math.floor(this.TotalHours / 24);
    }

    public get Months(): number {
        return Math.floor((this.TotalDays % 365.25) / 30.437);
    }

    public get Years(): number {
        return Math.floor(this.TotalDays / 365.25);
    }

    public get getTimeSpan(): TimespanReport {
        return {
            years: this.Years,
            months: this.Months,
            days: this.Days,
            hours: this.Hours,
            minutes: this.Minutes,
            seconds: this.Seconds,
            milliseconds: this.Milliseconds,
        };
    }
}
