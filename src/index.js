import fs from "fs";
import path from "path";
import { getData } from "./getData.js";
import { time, format, cloneTime, uniqueDates } from "./util.js";
import dotenv from "dotenv";

dotenv.config();

const login = process.env.LOGIN;
const password = process.env.PASSWORD;
const url = "https://trade.oanda.com";
const resultDir = "result";
const resultFilename = "snapshots"
const tempFilename = "temp";

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

const getTempData = () => {
  try {
    const s = fs.readFileSync(path.join(resultDir, tempFilename));
    return JSON.parse(s).map(snapshot => {
      return { time: time(snapshot.time), data: snapshot.data }
    });
  }
  catch(err) {
    if (err.code === "ENOENT") {
      return [];
    } throw err;
  }
}

const writeResult = (res) => {
  const date = format(res.time);
  const oPos = res.data.orderPositive.join(" ");
  const oNeg = res.data.orderNegative.join(" ");
  const pPos = res.data.positionPositive.join(" ");
  const pNeg = res.data.positionNegative.join(" ");
  const result = `${date}\norder positive ${oPos}\norder negative ${oNeg}\nposition potivie ${pPos}\nposition negative ${pNeg}`;
  fs.appendFileSync(path.join(resultDir, resultFilename), result);
}

const breakTempAtEarliestNewTime = (tmp, t) => {
  if (tmp.length === 0) {
    return [[], []];
  }
  const a = tmp[0].time;
  if (a.isBefore(t)) {
    const rest = tmp.slice(1);
    const [aa, bb] = breakTempAtEarliestNewTime(rest, t);
    return [[tmp[0], ...aa], bb];
  }
  return [[], tmp];
}

const breakConsecutive = (data) => {
  if (data.length === 0 || data.length === 1) {
    return [[], data];
  }

  const time1 = cloneTime(data[0].time);
  const time2 = data[1];
  if (time1.add(20, 'm').isSame(time2.time)) {
    const [a, b] = breakConsecutive(data.slice(1));
    return [[data[0], ...a], b];
  }
  return [[data[0]], data.slice(1)];
}

const doIt = (tempData, newData) => {
  let earliestNewTime = null;
  if (newData.length !== 0) {
    earliestNewTime = newData[0].time;
  } else {
    earliestNewTime = time("October 27, 2019 9:10 PM");
  }
  
  const [oldToResult, restOfTemp] = breakTempAtEarliestNewTime(tempData, earliestNewTime);
  const newTemp = uniqueDates(sort([...restOfTemp, ...newData]));
  const [consecutiveToResult, toTemp] = breakConsecutive(newTemp);
  const toResult = [...oldToResult, ...consecutiveToResult];
  return [toResult, toTemp];
}

const start = async () => {

  if (login === undefined || password === undefined) {
    throw "Login or password not specified in .env file";
  }

  try {
    fs.readdirSync(resultDir);
  } catch(err) {
    if (err.code === "ENOENT") {
      fs.mkdirSync(resultDir);
    } else {
      throw err;
    }
  }
  
  const tempData = getTempData();

  let earliestTmpTime = null;
  if (tempData.length !== 0) {
    earliestTmpTime = tempData[0].time;
  } else {
    earliestTmpTime = time("October 27, 2019 9:10 PM");
  }
  
  const newData = await getData(url, login, password, earliestTmpTime);
  
  const [toResult, toTemp] = doIt(tempData, newData);

  fs.writeFileSync(path.join(resultDir, tempFilename), JSON.stringify(toTemp));

  writeResult(toResult);
}

export { sort, breakTempAtEarliestNewTime, breakConsecutive, doIt, start };
