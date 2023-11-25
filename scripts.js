//Constant elements
const clrBtn = document.getElementById("getClrs");
// Message if color is copied to clipboard
const copiedColorMessage = document.getElementById("copied");
// Message if img is copied to clipboard
const copiedImageMessage = document.getElementById("imgCopied");
// List of colors
const colorList = document.getElementById("colList");
// List of images
const imgList = document.getElementById("imageList");

// Handles color parsing START --------------
clrBtn.addEventListener("click", () => {
  copiedImageMessage.style.display = "none";
  copiedColorMessage.style.display = "none";
  colorList.innerHTML = "";
  imgList.innerHTML = "";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: grabColors,
        },
        afterClr
      );
    } else {
      alert("No active tabs");
    }
  });
});

function grabColors() {
  //Turns Js property color to hex;
  function parseColor(color) {
    // if we are getting hex
    if (color.indexOf("#") != -1) return color;
    var arr = [];
    color.replace(/[\d+\.]+/g, function (v) {
      arr.push(parseFloat(v));
    });
    return "#" + arr.slice(0, 3).map(toHex).join("");
  }
  // Int to HEX
  function toHex(int) {
    var hex = int.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }

  function recursiveParse(element, colorStorage = {}) {
    if (!(element instanceof Element)) {
      // If we getting window instead of element
      return colorStorage;
    }
    // Check if we have inline style and this inline style is not a mixin
    const bgCol =
      element.style.backgroundColor &&
      !element.style.backgroundColor.includes("var")
        ? parseColor(element.style.backgroundColor)
        : parseColor(window.getComputedStyle(element).backgroundColor);

    const col =
      element.style.color && !element.style.color.includes("var")
        ? parseColor(element.style.color)
        : parseColor(window.getComputedStyle(element).color);

    //Add a field or increase it
    !colorStorage[bgCol]
      ? (colorStorage[bgCol] = 1)
      : (colorStorage[bgCol] += 1);

    !colorStorage[col] ? (colorStorage[col] = 1) : (colorStorage[col] += 1);
    // Next iteration if we have where to go
    if (element.children.length > 0) {
      for (let i = 0; i < element.children.length; i++) {
        recursiveParse(element.children[i], colorStorage);
      }
    }
  }

  let colorsStorage = {};
  recursiveParse(document.body, colorsStorage);

  // To sort object by values
  let colorsSorted = [];
  for (let color in colorsStorage) {
    colorsSorted.push([color, colorsStorage[color]]);
  }
  colorsSorted.sort(function (a, b) {
    return b[1] - a[1];
  });

  return colorsSorted;
}

// START https://stackoverflow.com/questions/13070054/convert-rgb-strings-to-hex-in-javascript -------
function parseColor(color) {
  //if we getting hex string
  if (color.indexOf("#") != -1) return color;
  var arr = [];
  color.replace(/[\d+\.]+/g, function (v) {
    arr.push(parseFloat(v));
  });
  return "#" + arr.slice(0, 3).map(toHex).join("");
}
// Int to HEX
function toHex(int) {
  var hex = int.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
// END https://stackoverflow.com/questions/13070054/convert-rgb-strings-to-hex-in-javascript -------
/**
 * Runs after grabColors, gets one frame of page
 * @param {[]InjectionResult} frame array of results of grabColors
 */
function afterClr(frames) {
  if (!frames || !frames.length) {
    alert(
      "Could not retrieve colors from specified page (probably it's google base page)"
    );
    return;
  }
  // All frames to one array
  const data = frames.map((frame) => frame.result)[0];
  for (let color of data) {
    const ul = document.getElementById("colList");
    const li = document.createElement("li");
    li.style.color = color[0];
    li.classList.add("list-el");
    li.innerHTML = `<div class="list-el__color-cube" style="background-color:${color[0]};"> </div>
     <div class="list-el__text" style="color:${color[0]};" > ${color[0]} Frequency: ${color[1]} </div>`;
    ul.appendChild(li);
  }

  let btns = document.querySelectorAll("div.list-el__text");
  for (i of btns) {
    i.addEventListener("click", function () {
      const color = parseColor(this.style.color);
      window.navigator.clipboard.writeText(color);
      copiedColorMessage.style.display = "block";
      copiedColorMessage.style.color = color;
    });
  }
}
// Handles color parsing END --------------
// Handles image parsing START --------------
const grabImg = document.getElementById("getImg");
grabImg.addEventListener("click", () => {
  colorList.innerHTML = "";
  imgList.innerHTML = "";
  copiedColorMessage.style.display = "none";
  copiedImageMessage.style.display = "none";
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (tab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id, allFrames: true },
          func: grabImages,
        },
        onImgResult
      );
    } else {
      alert("There are no active tabs");
    }
  });
});

function grabImages() {
  const images = document.querySelectorAll("img");
  return Array.from(images).map((image) => image.src);
}

/**
 * runs after grabImages is done on all frames of webpage
 * @param {[]InjectionResult} frames -- Array of grabImages() results
 */
function onImgResult(frames) {
  // Если результатов нет
  if (!frames || !frames.length) {
    alert(
      "Could not retrieve images from specified page (probably it's google base page)"
    );
    return;
  }
  // Unite all urls from all frames to one array
  const imageUrls = frames
    .map((frame) => frame.result)
    .reduce((r1, r2) => r1.concat(r2));

  const imageSet = new Set(imageUrls);
  const uniqueUrls = Array.from(imageSet);

  for (let image of uniqueUrls) {
    const div = document.createElement("div");
    div.classList.add("img-list-el");
    div.innerHTML = ` <img class="img-list-el__clickable" height="50" width="50"  src="${image}">`;
    imgList.appendChild(div);
  }

  let images = document.querySelectorAll("img.img-list-el__clickable");
  for (i of images) {
    i.addEventListener("click", function () {
      const url = this.getAttribute("src");
      window.navigator.clipboard.writeText(url);
      copiedImageMessage.style.display = "block";
    });
  }
}
