import nhp from 'node-html-parser';
import swd from 'selenium-webdriver';
import fwd from 'selenium-webdriver/firefox.js';
import moment from 'moment';

const { Builder, By, until } = swd;
const { Options } = fwd;

const createDriver = async () => {
  if (process.platform === "linux") {
    const ffOptions = new Options().setBinary("/usr/bin/firefox-bin");
    return new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(ffOptions).build();
  } else {
    return new Builder().forBrowser('firefox').build();
  }
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

/*    
  await driver.wait(() => {
    return driver.executeScript('return document.readyState').then(readyState => {
      return readyState === 'complete';
    });
  }, 10000);*/
}

const logOut = async (driver) => {
  const signOut = await driver.wait(until.elementLocated(By.id("signOut")), 10000);
  await signOut.click();
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

// Snapshot Time: October 27, 2020 9:10 PM &nbsp;&nbsp;
const getSnapTime = (source) => {
  const html = nhp.parse(source);
  const rawDate = html.querySelector(".snapshot-date").innerHTML;
  const snapshotDate = rawDate.slice(15).split("").reverse().slice(13).reverse().join("");
  return moment(snapshotDate, "LLL");
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
//  await driver.wait(until.elementLocated(By.id("chartContainer22")), 10000);
//  await driver.sleep(5000);

}

const getData = async (url, login, password, lsp) => {
  let driver = await createDriver();
  await logIn(driver, url, login, password);
  const allButton = await driver.wait(until.elementLocated(By.xpath("//paper-item[@data-value='all']")), 10000);
  const allButtonVisible = await driver.wait(until.elementIsVisible(allButton));
  //const allButton = await driver.wait(until.elementLocated(By.className("paper-item-0")), 10000);   
  await allButtonVisible.click();

  const source = await driver.getPageSource();
  const candlesNum = getCandlesNum(source);
  const candles = await getCandles(driver);
  
  const lastSnapTime = lsp ? lsp : moment("October 27, 2019 9:10 PM", "LLL");
  
  const getIt = async (containerId, candlesNum) => {
    const source = await driver.getPageSource();
    const snapTime = getSnapTime(source);

    if (snapTime.isAfter(lastSnapTime)) {
      const snapData = getSnapshotData(source, containerId);
      if (candlesNum > 1) {
	await hoverMouse(driver, candles, candlesNum - 1);
	await driver.sleep(10000);
	const rest = await getIt(containerId - 1, candlesNum -1);
	return [...rest, { time: snapTime.format("LLL"), data: snapData }];
      } else {
	return [{ time: snapTime.format("LLL"), data: snapData }];
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
