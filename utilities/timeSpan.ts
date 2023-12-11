export type TimespanReport = {
    Years: number,
    Months: number,
    Days: number,
    Hours: number,
    Minutes: number,
    Seconds: number,
    Milliseconds: number,
    TotalDays: number,
    TotalHours: number,
    TotalMinutes: number,
    TotalSeconds: number,
    TotalMilliseconds: number,

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
            Years: this.Years,
            Months: this.Months,
            Days: this.Days,
            Hours: this.Hours,
            Minutes: this.Minutes,
            Seconds: this.Seconds,
            Milliseconds: this.Milliseconds,
            TotalDays: this.TotalDays,
            TotalHours: this.TotalHours,
            TotalMinutes: this.TotalMinutes,
            TotalSeconds: this.TotalSeconds,
            TotalMilliseconds: this.TotalMilliseconds,
        };
    }
}
