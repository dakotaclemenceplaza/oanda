import moment from 'moment';

const time = (s) => moment(s, "LLL");
const format = (t) => t.format("LLL");
const cloneTime = (t) => time(format(t));

const sort = (data) => {
  return data.sort((a, b) => {
    if (a.time.isBefore(b.time)) {
      return -1;
    } else if (a.time.isSame(b.time)) {
      return 0;
    }
    return 1;
  });
}

const uniqueSortedByDate = (d) => {
  const helper = (d) => {
    if (d.length === 0 || d.length === 1) {
      return d;
    } else if (d[0].time.isSame(d[1].time)) {
      return uniqueSortedByDate(d.slice(1));
    }
    const rest = uniqueSortedByDate(d.slice(1));
    return [d[0], ...rest];
  }
  return helper(sort(d));
}

export { time, format, cloneTime, sort, uniqueSortedByDate };
