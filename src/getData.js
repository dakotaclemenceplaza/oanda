import nhp from 'node-html-parser';
import swd from 'selenium-webdriver';
import cwd from 'selenium-webdriver/chrome.js';
import { time } from './util.js';

const { Builder, By, until } = swd;
const { Options } = cwd;

const createDriver = async () => {
  const headless = process.argv.includes("headless");
  let cOptions = null;
  if (headless) {
    cOptions = new Options().addArguments("disable-gpu", "window-size=1920,1080", "headless");
  } else {
    cOptions = new Options().addArguments("disable-gpu", "window-size=1920,1080");
  }
  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(cOptions).build();
}

const logIn = async (driver, url, login, password) => {
  await driver.get(url);
  const radioButton = await driver.wait(until.elementLocated(By.xpath("//paper-radio-button[@name='practice']")), 10000);
  await radioButton.click();
  const username = await driver.wait(until.elementLocated(By.id("username")), 10000);
  const pass = await driver.wait(until.elementLocated(By.id("password")), 10000);
  await username.sendKeys(login);
  await pass.sendKeys(password);
  const loginButton = await driver.wait(until.elementLocated(By.id("loginButton")), 10000);
  await loginButton.click();
}

const logOut = async (driver) => {
  const signOut = await driver.wait(until.elementLocated(By.id("signOut")), 10000);
  await signOut.click();
  // maybe wait a bit
}

/*
23 containers on the page
every container has orders div and positions div
every order and every position has g positive and g negative
every g has rects
*/

const orderClasses = "book-chart-container order-chart-container order-chart-margin style-scope order-book";
const positionClasses = "book-chart-container position-chart-container position-chart-margin style-scope order-book";

const gClassesPos = "highcharts-series highcharts-series-0 highcharts-column-series highcharts-color-0 highcharts-tracker highcharts-dense-data";
const gClassesNeg = "highcharts-series highcharts-series-1 highcharts-column-series highcharts-color-1 highcharts-tracker highcharts-dense-data";

const getSnapshotData = (source, containerId) => {

  const getAtts = (rects) => {
    return rects.map(r => {
      return r.getAttribute("height");
    })
  }

  const html = nhp.parse(source);

  const container = html.querySelector("#chartContainer" + containerId.toString());

  const orders = filterByClasses(container.querySelectorAll("div"), orderClasses);
  const positions = filterByClasses(container.querySelectorAll("div"), positionClasses);

  // orders
  const allOGs = orders[0].querySelectorAll("g");

  const gOPos = filterByClasses(allOGs, gClassesPos);

  const gONeg = filterByClasses(allOGs, gClassesNeg);

  const rectOPos = gOPos[0].querySelectorAll("rect");
  const rectONeg = gONeg[0].querySelectorAll("rect");
  
  const orderPos = getAtts(rectOPos);
  const orderNeg = getAtts(rectONeg);
  
  //positions
  const allPGs = positions[0].querySelectorAll("g");
  const gPPos = filterByClasses(allPGs, gClassesPos);
  const gPNeg = filterByClasses(allPGs, gClassesNeg);

  const rectPPos = gPPos[0].querySelectorAll("rect");
  const rectPNeg = gPNeg[0].querySelectorAll("rect");

  const positionPos = getAtts(rectPPos);
  const positionNeg = getAtts(rectPNeg);

  const resObject = {
    orderPositive: orderPos,
    orderNegative: orderNeg,
    positionPositive: positionPos,
    positionNegative: positionNeg
  }
  
  return resObject;
}

const filterByClasses = (tagsArray, classes) => {
  const classArr = classes.split(" ");
  return tagsArray.filter((el) => {
    return el.classNames.length === classArr.length
      &&
      classArr.every((cl) => {
	return el.classNames.includes(cl);
      })
  })
}

const getSnapTime = (source) => {

  const toEngDate = (d) => {
    const months = {
      "января": "January",
      "февраля": "February",
      "марта": "March",
      "апреля": "April",
      "мая": "May",
      "июня": "June",
      "июля": "July",
      "августа": "August",
      "сентября": "September",
      "октября": "October",
      "ноября": "November",
      "декабря": "December"
    }
    const dArr = d.split(" ");
    const day = dArr[0];
    const month = dArr[1];
    const year = dArr[2];
    const time = dArr[4];
    const engDate = [months[month], day, year, time];
    return engDate.join(" ");
  }
  
  const html = nhp.parse(source);
  const rawDate = html.querySelector(".snapshot-date").innerHTML;
  const snapshotDate = rawDate.slice(15).split("").reverse().slice(13).reverse().join("");
    return time(toEngDate(snapshotDate));
}

const getCandlesNum = (source) => {
  const html = nhp.parse(source);
  const candlesInGtag = html.querySelectorAll(".highcharts-candlestick-series");
  return candlesInGtag[0].childNodes.length;
}

const getCandles = async (driver) => {
  const gWithCandles = await driver.findElements(By.className("highcharts-series-group"));
  const fuck = await gWithCandles[2];
  const pathTags = await fuck.findElements(By.css("path"));
  return pathTags;
}

const hoverMouse = async (driver, candles, candleNum) => {
  const theCandle = candles[candleNum - 1];
//  await theCandle.click();
  await driver.actions().pause(1000).move({origin: theCandle}).perform();
}

const getData = async (url, login, password, earliestTmpTime) => {
  let driver = await createDriver();
  await logIn(driver, url, login, password);

  const allButton = await driver.wait(until.elementLocated(By.xpath("//paper-item[@data-value='all']")), 10000);
  await driver.sleep(5000);

  await allButton.click();
  await driver.sleep(5000);

  const dropDown = await driver.wait(until.elementLocated(By.xpath("//iron-icon[@icon='paper-dropdown-menu:arrow-drop-down']")), 10000);
  await dropDown.click();
  await driver.sleep(5000);

  const nonCum = await driver.wait(until.elementLocated(By.xpath("//paper-item[@data-value='nc']")), 10000);
  await nonCum.click();

  const source = await driver.getPageSource();
  const candlesNum = getCandlesNum(source);
  const candles = await getCandles(driver);
  
  const lastSnapTime = earliestTmpTime ?
	earliestTmpTime :
	time("October 27, 2019 9:10 PM");
  
  const getIt = async (containerId, candlesNum) => {
    const source = await driver.getPageSource();
    const snapTime = getSnapTime(source);

    if (snapTime.isSameOrAfter(lastSnapTime)) {
      const snapData = getSnapshotData(source, containerId);
      if (candlesNum > 20) {
	await hoverMouse(driver, candles, candlesNum - 1);
	await driver.sleep(5000);
	const rest = await getIt(containerId - 1, candlesNum -1);
	return [...rest, { time: snapTime, data: snapData }];
      } else {
	return [{ time: snapTime, data: snapData }];
      }
    }

    return [];
  }

  const data = await getIt(23, candlesNum).catch(e => {
    console.log(e);
    logOut(driver).then(() => driver.quit());
  });

  await logOut(driver);
  await driver.quit();
  return data;
}

export { getData };
