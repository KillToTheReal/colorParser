// Handles your frontend UI logic.
const getBtn = document.getElementById("getClrs");
const copied = document.getElementById("copied");
getBtn.addEventListener("click", () => {
  copied.style.display = "none";
  copied.style.color = "#000";
  const ul = document.getElementById("colList");
  ul.innerHTML = "";
  chrome.tabs.query({ active: true }, (tabs) => {
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
    const bgCol = parseColor(window.getComputedStyle(element).backgroundColor);
    const col = parseColor(window.getComputedStyle(element).color);

    !colorStorage[bgCol]
      ? (colorStorage[bgCol] = 1)
      : (colorStorage[bgCol] += 1);

    !colorStorage[col] ? (colorStorage[col] = 1) : (colorStorage[col] += 1);

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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.sortableData) {
    // Getting data from google tab script
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
