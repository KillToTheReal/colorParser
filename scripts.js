// Handles color parsing START --------------
const getBtn = document.getElementById("getClrs");
const copied = document.getElementById("copied");
const ulList = document.getElementById("colList");
const imgList = document.getElementById("imageList");
getBtn.addEventListener("click", () => {
  copied.style.display = "none";

  ulList.innerHTML = "";
  imgList.innerHTML = "";
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: grabColors,
      });
    } else {
      alert("No active tabs");
    }
  });
});

function grabColors() {
  // Turns Js property color to hex;
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
  let sortable = [];
  for (let color in colorsStorage) {
    sortable.push([color, colorsStorage[color]]);
  }
  sortable.sort(function (a, b) {
    return b[1] - a[1];
  });

  // Getting gathered sorted data out of chrome.ExecuteScript context to parse list in ext window context
  chrome.runtime.sendMessage({ sortableData: sortable });
}

// Getting values from colorGrabber
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.sortableData) {
    const colorData = request.sortableData;
    processColorData(colorData);
    // Just in case
    sendResponse({ received: true });
  }
});

function parseColor(color) {
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

function processColorData(data) {
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
      copied.style.display = "block";
      copied.style.color = color;
    });
  }
}
// Handles color parsing END --------------
// Handles image parsing START --------------
const grabImg = document.getElementById("getImg");
grabImg.addEventListener("click", () => {
  ulList.innerHTML = "";
  imgList.innerHTML = "";
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (tab) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
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
 * Выполняется после того как вызовы grabImages
 * выполнены во всех фреймах удаленной web-страницы.
 * Функция объединяет результаты в строку и копирует
 * список путей к изображениям в буфер обмена
 *
 * @param {[]InjectionResult} frames Массив результатов
 * функции grabImages
 */
function onImgResult(frames) {
  // Если результатов нет
  if (!frames || !frames.length) {
    alert("Could not retrieve images from specified page");
    return;
  }
  // Объединить списки URL из каждого фрейма в один массив
  const imageUrls = frames
    .map((frame) => frame.result)
    .reduce((r1, r2) => r1.concat(r2));

  const imageSet = new Set(imageUrls);
  const uniqueUrls = Array.from(imageSet);
  // Скопировать в буфер обмена полученный массив
  // объединив его в строку, используя символ перевода строки
  // как разделитель
  for (let image of uniqueUrls) {
    const div = document.createElement("div");
    div.classList.add("img-list-el");
    div.innerHTML = ` <img height="40" width="40" src="${image}">`;
    imgList.appendChild(div);
  }
  window.navigator.clipboard
    .writeText(uniqueUrls.join("\n\n\n"))
    .then(() => {});
}
