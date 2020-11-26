import moment from 'moment';

const time = (s) => moment(s, "LLL");
const format = (t) => t.format("LLL");
const cloneTime = (t) => time(format(t));

const uniqueDates = (d) => {
  return [...new Set(d.map(t => t.time.unix()))].map(t => {
    return { time: moment(t, 'X') }
  });
}

export { time, format, cloneTime, uniqueDates };
