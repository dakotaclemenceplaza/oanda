import fs from "fs";
import path from "path";
import { getData } from "./getData.js";
import { time } from "./util.js";
import dotenv from "dotenv";

dotenv.config();

const login = process.env.LOGIN;
const password = process.env.PASSWORD;
const url = "https://trade.oanda.com";
const resultDir = "result";
const resultFilename = "snapshot" // + number: snapshot-0, snapshot-1
const tempFilename = "temp";
const filenameLength = resultFilename.length;


const findFileToWrite = (files) => {
  if (files.length === 0) {
    return null;
  }

  const resFiles = files.filter(f => f.slice(0, filenameLength + 1) === resultFilename + "-");
  if (resFiles.length === 0) {
    return null;
  }
    
  const num = Math.max(resFiles.map(f => Number(f.slice(filenameLength + 1)))).toString();
  return resultFilename + "-" + num;
}

const getLastSnapTime = (file) => {
  const data = fs.readFileSync(path.join(resultDir, file), "utf8");
  const parsed = JSON.parse(data);
  return time(parsed[parsed.length - 1].time);
}

const nextFilename = (file) => {
  const nextNum = Number(file.slice(filenameLength + 1)) + 1;
  return resultFilename + "-" + nextNum.toString();
}

const getTmpData = () => {
  try {
    const s = fs.readFileSync(path.join(resultDir, tempFilename));
    return JSON.parse(s).map((snapshot) => {
      return { time: time(snapshot.time), data: snapshot.data }
    });
  }
  catch(err) {
    if (err.code === "ENOENT") {
      return null;
    } throw err;
  }
}

const sort = (data) => {
  return data.sort((a, b) => {
    const aa = a.time;
    const bb = b.time;
    if (aa.isBefore(bb)) {
      return -1;
    } else if (aa.isSame(bb)) {
      return 0;
    }
    return 1;
  });
}

const breakResultAndRest = (tmp, t) => {
  if (tmp.length === 0) {
    return [[], []];
  }
  const a = tmp[0].time;
  if (a.isBefore(t)) {
    const rest = tmp.slice(1);
    const [aa, bb] = breakResultAndRest(rest, t);
    return [[tmp[0], ...aa], bb];
  }
  return [[], tmp];
}

const breakMore = (data) => {
  if (data.length === 0 || data.length === 1) {
    return [[], data];
  }
  
  const fuck1 = data[0];
  const fuck2 = data[1];
  if (fuck1.time.add(20, 'm').isSame(fuck2.time)) {
    const [a, b] = breakMore(data.slice(1));
    return [[data[0], ...a], b];
  }
  return [[], data];
}

const doIt = (tempData, newData) => {
  const earliestTime = newData[0].time;
  const [moveToResult, rest] = breakResultAndRest(tempData, earliestTime);
    const merged = sort([...rest, ...newData]);
  const [a, b] = breakMore(merged);
  const toResult = moveToResult.concat(a);
  return [toResult, b];
}

const start = async () => {

  if (login === undefined || password === undefined) {
    throw "Login or password not specified in .env file";
  }

  const tempData = getTmpData();
  const earliestTmpTime = tempData[0].time;
  const newData = await getData(url, login, password, earliestTmpTime);
  const [toRes, toTmp] = doIt(tempData, newData);

  const toResult = toRes.map((snap) => {
    return { time: snap.time.format("LLL"), data: snap.data };
  });
  const toTemp = toTmp.map((snap) => {
    return { time: snap.time.format("LLL"), data: snap.data };
  });

  
    /*
    fs.mkdirSync(resultDir);
    fs.writeFileSync(path.join(resultDir, resultFilename + "-0"), JSON.stringify(data));
    return null;
    */
/*
  let files = null;
  try {
    files = fs.readFileSync(path.join(resultDir, tempFilename));
  }
  catch(err) {
    if (err.code === "ENOENT") {
      const data = await getData(url, login, password);
      fs.mkdirSync(resultDir);
      fs.writeFileSync(path.join(resultDir, resultFilename + "-0"), JSON.stringify(data));
      return null;
    }
    throw err;
  }
  
  const file = findFileToWrite(files);
  
  if (file) {
    const lastSnapTime = getLastSnapTime(file);
    const data = await getData(url, login, password, lastSnapTime);
    const nextSnapTime = data[0].time;
    if (lastSnapTime.add(1, 'h').isSame(nextSnapTime)) {
      fs.appendFileSync(path.join(resultDir, file), JSON.stringify(data));
    } else {
      const nextFile = nextFilename(file);
      fs.writeFileSync(path.join(resultDir, nextFile), JSON.stringify(data));
    }
  } else {
    const data = await getData(url, login, password);
    fs.writeFileSync(path.join(resultDir, resultFilename + "-0"), JSON.stringify(data));
  }
}
*/
/*
const start = async () => {

  if (login === undefined || password === undefined) {
    throw "Login or password not specified in .env file";
  }

  let files = null;
  try {
    files = fs.readdirSync(resultDir);
  }
  catch(err) {
    if (err.code === "ENOENT") {
      const data = await getData(url, login, password);
      fs.mkdirSync(resultDir);
      fs.writeFileSync(path.join(resultDir, resultFilename + "-0"), JSON.stringify(data));
      return null;
    }
    throw err;
  }
  
  const file = findFileToWrite(files);
  
  if (file) {
    const lastSnapTime = getLastSnapTime(file);
    const data = await getData(url, login, password, lastSnapTime);
    const nextSnapTime = data[0].time;
    if (lastSnapTime.add(1, 'h').isSame(nextSnapTime)) {
      fs.appendFileSync(path.join(resultDir, file), JSON.stringify(data));
    } else {
      const nextFile = nextFilename(file);
      fs.writeFileSync(path.join(resultDir, nextFile), JSON.stringify(data));
    }
  } else {
    const data = await getData(url, login, password);
    fs.writeFileSync(path.join(resultDir, resultFilename + "-0"), JSON.stringify(data));
  }
}
*/
}
start();

export { sort, breakResultAndRest };
