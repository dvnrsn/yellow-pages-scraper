const express = require("express");
const app = express();
const axios = require("axios");
const cheerio = require("cheerio");
const converter = require("json-2-csv");
const fs = require("fs");

const PORT = process.env.port || 3000;

app.listen(PORT, () => {
  console.log(`server is running on PORT:${PORT}`);
});

let pageNumber = 1;
let masterList = [];
let done = false;
let YPnumber = 0;

const searchTerm = "pet+grooming";

async function invoke() {
  const yellowBase = "https://www.yellowpages.com";
  const base = `${yellowBase}/search?search_terms=${searchTerm}&geo_location_terms=Salt+Lake+City%2C+UT`;

  function getAllBusinessesOnPage($, results) {
    let currOrgs = [];
    results.each(function () {
      const title = $(this).find("h2").text();
      const ref = $(this).find("a").attr("href");
      currOrgs = [...currOrgs, { title, ref }];
    });
    return currOrgs;
  }

  let promises = [];

  async function requestBusinesses(url) {
    console.log("\n", url);
    return axios.get(url).then((res) => {
      const html = res.data;
      const $ = cheerio.load(html);

      const newBusinesses = getAllBusinessesOnPage($, $(".result"));
      return newBusinesses;
    });
  }
  async function getBusinessEmail(url, obj) {
    return axios.get(`${yellowBase}${url}`).then((res) => {
      const html = res.data;
      const $ = cheerio.load(html);

      const email = $(".email-business").attr("href")?.split(":")[1] || "";
      const { ref, ...rest } = obj;
      return { ...rest, email };
    });
  }

  // [...Array(5)].forEach((_, i) => {
  //   promises.push(requestBusinesses(`${base}&page=${i + 1}`));
  // });

  // const businesses = (await Promise.all(promises)).flat();

  const businesses = await requestBusinesses(`${base}&page=${pageNumber}`);

  if (businesses.length === 0) {
    done = true;
    console.log("No businesses left");
    return;
  }

  const emailPromises = businesses.map((bus) => getBusinessEmail(bus.ref, bus));
  const withEmail = await Promise.all(emailPromises);

  console.log("YPnumber", YPnumber);

  // { title: '30. Intermountain Healthcare', email: '' }
  newYPnumber = withEmail[withEmail.length - 1].title.split(".")[0];
  if (newYPnumber == YPnumber) {
    console.log("The same number is showing up");
    console.log(withEmail[withEmail.length - 1]);
    done = true;
  }
  YPnumber = newYPnumber;

  const filtered = withEmail
    .filter((bus) => bus.email)
    .map((bus) => ({
      ...bus,
      title: isNaN(bus.title[0]) ? bus.title : bus.title.split(".")[1].trim(),
    }));

  masterList = [...masterList, ...filtered];
  console.log("masterList length: ", masterList.length);
  console.log("final item: ", masterList[masterList.length - 1]);
  pageNumber++;
}

const interval = setInterval(() => {
  if (done) {
    clearInterval(interval);
    let json2csvCallback = function (err, csv) {
      console.log("Successfully Loaded");
      fs.writeFileSync(`${searchTerm}.csv`, csv);
      if (err) throw err;
    };

    converter.json2csv(masterList, json2csvCallback);
  }
  try {
    invoke();
  } catch (err) {
    console.error(err);
  }
}, 15000);

const x = { a: 1, b: 2 };
for (const [key, value] of Object.entries(x)) {
  print(`${key}=${value}`);
}
