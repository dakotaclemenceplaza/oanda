import { sort, breakResultAndRest } from "../src/index.js";
import rdg from "random-date-generator";
import { time } from "../src/util.js";

const startDate = new Date(2020, 2, 2);
const endDate = new Date(2020, 3, 3);
const aDate = time(rdg.getRandomDateInRange(startDate, endDate));
const dates = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map((a) => {
  return { time: time(rdg.getRandomDateInRange(startDate, endDate)) };
});

test('sorting dates array', () => {
  const sortedDates = sort(dates);
  const b = sortedDates.reduce((acc, d) => {
    if (acc.bool) {
      return { time: d.time, bool: acc.time.isBefore(d.time) };
    } else {
      return acc;
    }
  }, { time: time(rdg.getRandomDateInRange(new Date(2019, 1, 1), new Date(2020, 1, 1))),
       bool: true });
  expect(b.bool).toBe(true);

  expect(sortedDates.length).toBe(dates.length);
});

const sortedDates = sort(dates);

test('breaking dates array in two', () => {
  const [res, rest] = breakResultAndRest(sortedDates, aDate);
  const b = res.every((d) => rest.every((dd) => d.time.isBefore(dd.time)));
  expect(b).toBe(true);
  const before = dates.filter((d) => d.time.isBefore(aDate));
  const after = dates.filter((d) => d.time.isAfter(aDate));
  expect(before).toEqual(res);
  expect(after).toEqual(rest);

  expect(res.length + rest.length).toBe(sortedDates.length);
  
  const aDateInArr = sortedDates[0].time;
  const [res1, rest1] = breakResultAndRest(sortedDates, aDateInArr);
  const b1 = res.every((d) => rest.every((dd) => d.time.isBefore(dd.time)));
  expect(b1).toBe(true);
  const before1 = dates.filter((d) => d.time.isBefore(aDateInArr));
  const after1 = dates.filter((d) => d.time.isAfter(aDateInArr));
  expect(before1).toEqual(res1);
  expect([sortedDates[0], ...after1]).toEqual(rest1);

  expect(res1.length + rest1.length).toBe(sortedDates.length);
});

