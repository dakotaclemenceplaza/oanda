import fs from "fs";
import path from "path";
import { getData } from "./getData.js";
import moment from "moment";
import dotenv from "dotenv";

dotenv.config();

const login = process.env.LOGIN;
const password = process.env.PASSWORD;
const url = "https://trade.oanda.com";
const resultDir = "result";
const resultFilename = "snapshot" // + number: snapshot-0, snapshot-1
const filenameLength = resultFilename.length;
      
const findFileToWrite = (files) => {
  if (files.length === 0) {
    return null;
  }

  const resFiles = files.filter(f => f.slice(0, filenameLength + 1) === resultFileName + "-");
  if (resFiles.length === 0) {
    return null;
  }
    
  const num = Math.max(resFiles.map(f => Number(f.slice(filenameLength + 1)))).toString();
  return resultFileName + "-" + num;
}

const getLastSnapTime = (file) => {
  const data = fs.readFileSync(path.join(resultDir, file), "utf8");
  const parsed = JSON.parse(data);
  return moment(parsed[parsed.length - 1].time, "LLL");
}

const nextFilename = (file) => {
  const nextNum = Number(file.slice(filenameLength + 1)) + 1;
  return resultFileName + "-" + nextNum.toString();
}

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

start();
