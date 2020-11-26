import fc from "fast-check";
import { sort, breakResultAndRest, breakMore, doIt } from "../src/index.js";
import { time, cloneTime, uniqueDates } from "../src/util.js";

const dateRange = { min: new Date('2020-11-01 09:00'), max: new Date('2020-11-05 09:00') };
const fcDate = fc.date(dateRange).map(d => { return { time: time(d) } });

const fcDateArr = fc.array(fcDate, 0, 30);

const sorted = (dates) => {
  return dates.reduce((acc, d) => {
    if (acc.bool) {
      return { time: d.time, bool: acc.time.isSameOrBefore(d.time) };
    } else {
      return acc;
    }
  }, { time: time(new Date(2020, 1, 1)),
       bool: true }).bool;
}

test('sorting dates', () => {
  fc.assert(
    fc.property(fcDateArr, dates => {
      const sortedDates = sort(dates)

      expect(sortedDates.length).toBe(dates.length);
      expect(sorted(sortedDates)).toBe(true);
    }))
});

test('breaking dates array in two', () => {
  fc.assert(
    fc.property(fc.tuple(fcDate, fcDateArr), tuple => {
      const date = tuple[0];
      const dates = sort(tuple[1]);
      const [result, rest] = breakResultAndRest(dates, date);
      const b = result.every((d) => rest.every((dd) => d.time.isBefore(dd.time)));
      expect(b).toBe(true);
      const before = dates.filter((d) => d.time.isBefore(date));
      const after = dates.filter((d) => d.time.isSameOrAfter(date));
      expect(result).toEqual(before);
      expect(rest).toEqual(after);
      expect(result.length + rest.length).toBe(dates.length);
    }))
});

test('breakMore works', () => {
  let st = time(new Date('2020-11-01 09:00'));
  let dates = [];
  for (let i = 0; i < 15; i++) {
    if (i < 8) {
      dates.push({ time: cloneTime(st.add(20, 'm')) });
    } else if (i === 8) {
      dates.push({ time: cloneTime(st.add(40, 'm')) });
    } else {
      dates.push({ time: cloneTime(st.add(20, 'm')) });
    }
  }
  const [x, y] = breakMore(dates);
  expect(x.length).toBe(8);
  expect(y.length).toBe(7);
});


test("complicated property tests", () => {

  // add weekend nulls
  const start = time(new Date('2020-11-01 09:00'));
  const fakeSnapshots = [];
  for (let i = 0; i < 500; i++) {
    fakeSnapshots[i] = { time: cloneTime(start) };
    start.add(20, 'm');
  };

  const fakeTimes = fc.array(fc.date({ min: new Date('2020-11-01 09:00'),
				       max: new Date('2020-11-08 07:20') }), 0, 30);

  fc.assert(
    fc.property(fakeTimes, fakeCurrentTimes => {

      let fakeTempData = [];
      let fakeResult = [];

      let testResult = [];

      const fakeGetData = (fakeCurrentTime, ett) => {
	let i = fakeSnapshots.findIndex(t => t.time.isSameOrAfter(fakeCurrentTime)) - 1;
	let fakeData = [];
	let j = i - 72 > 0 ? i - 72 : 0;
	for (i; i >= j; i = i - 3) {
	  if (i >= 0 && fakeSnapshots[i].time.isAfter(ett)) {
	    fakeData.unshift(fakeSnapshots[i]);
	  }
	}

	testResult = uniqueDates([...testResult, ...fakeData]);
	// maybe cut fakeSnapshots
	return fakeData;
      }

      const fct = sort(uniqueDates(fakeCurrentTimes.map(d => { return { time: time(d) } })));
      for (let i = 0; i < fct.length; i++) {
	let earliestTmpTime = null;
	if (fakeTempData.length !== 0) {
	  earliestTmpTime = fakeTempData[0].time;
	} else {
	  earliestTmpTime = time("October 27, 2019 9:10 PM");
	}

	const newData = fakeGetData(fct[i].time, earliestTmpTime);
	const [toRes, toTemp] = doIt(fakeTempData, newData);
	fakeTempData = toTemp;
	fakeResult = fakeResult.concat(toRes);
      }

      expect([...fakeResult, ...fakeTempData].length).toEqual(testResult.length);

      expect(sorted(fakeResult)).toBe(true);
    
    })
  );
});

