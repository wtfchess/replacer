// Ставит точки
function AddPeriodIfMissing(text) {
  if (text == null || text.trim() === "") {
    return text;
  }
  const trimmedText = text.trim();
  const lastChar = trimmedText.charAt(trimmedText.length - 1);
  const regex = /[a-zA-Zа-яА-Я0-9]$/;
  if (regex.test(lastChar)) {
    return trimmedText.endsWith(".") ? trimmedText : trimmedText + ".";
  }
  return trimmedText;
}

// Ищет текст для замены
function GetReplacedText(text, find, findRegex, ignoreCase, replace) {
  if (text == null) {
    return "";
  }

  let findResult = null;
  if (findRegex) {
    findResult = findRegex.exec(text);
  } else {
    let index;
    if (ignoreCase) {
      index = text.toLowerCase().indexOf(find.toLowerCase());
    } else {
      index = text.indexOf(find);
    }
    if (index != -1) {
      findResult = [];
      findResult.push(text.substring(index, index + find.length));
    }
  }
  if (findResult == null || findResult.length == 0) {
    return text;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    if (realReplace.indexOf(param) != -1) {
      realReplace = realReplace.replaceAll(param, findResult[k]);
    }
  }
  const index = text.indexOf(findResult[0]) + findResult[0].length;
  const firstPart = text.substring(0, index);
  const secondPart = text.substring(index);
  return (
    firstPart.replaceAll(findResult[0], realReplace) + GetReplacedText(secondPart, find, findRegex, ignoreCase, replace)
  );
}

// Замена
function GetReplaceResult(text, find, findRegex, ignoreCase, replace) {
  if (text == null) {
    return null;
  }

  let findResult = null;
  if (findRegex) {
    findResult = findRegex.exec(text);
  } else {
    let index;
    if (ignoreCase) {
      index = text.toLowerCase().indexOf(find.toLowerCase());
    } else {
      index = text.indexOf(find);
    }
    if (index != -1) {
      findResult = [];
      findResult.push(text.substring(index, index + find.length));
    }
  }

  console.log(`Text: "${text}", Find: "${find}", Found: "${findResult}"`);

  if (findResult == null || findResult.length == 0) {
    return null;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    if (realReplace.indexOf(param) != -1) {
      realReplace = realReplace.replaceAll(param, findResult[k]);
    }
  }
  let result = [];
  result.push(findResult[0]);
  result.push(realReplace);
  return result;
}

// Все замены направлены на определенный элемент на странице
function DoTaskForElements(rootNode, find, findRegex, ignoreCase, replace, check, highlight) {
  const elements = rootNode.querySelectorAll("div.text_wrapper > div.text");
  let findCount = 0;
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    if (tagName == "script" || tagName == "style" || tagName == "img") {
      continue;
    }
    const visible =
      element.offsetWidth > 0 && element.offsetHeight > 0 && getComputedStyle(element).visibility == "visible";
    if (!visible) {
      continue;
    }
    if (tagName == "input" || tagName == "textarea") {
      let text = element.value;
      text = AddPeriodIfMissing(text);
      element.value = text;
      const result = GetReplaceResult(text, find, findRegex, ignoreCase, replace);
      if (result == null) {
        continue;
      }
      if (replace == result[1] || text.indexOf(result[1]) == -1) {
        findCount = findCount + 1;
        if (highlight) {
          //do nothing
        } else if (check) {
          //do nothing
        } else {
          element.value = GetReplacedText(text, find, findRegex, ignoreCase, replace);
        }
      }
    } else if (element.childNodes.length > 0) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.nodeValue;
          text = AddPeriodIfMissing(text);
          node.nodeValue = text;
          const result = GetReplaceResult(text, find, findRegex, ignoreCase, replace);
          if (result == null) {
            continue;
          }
          if (replace == result[1] || text.indexOf(result[1]) == -1) {
            findCount = findCount + 1;
            if (highlight) {
              const html = element.innerHTML;
              const newHtml = html.replaceAll(
                result[0],
                `<span class="class_hl_find_and_replace" style="background-color:yellow">${result[0]}</span>`
              );
              element.innerHTML = newHtml;
              break;
            } else if (check) {
              // do nothing
            } else {
              node.nodeValue = GetReplacedText(text, find, findRegex, ignoreCase, replace);
            }
          }
        }
      }
    }
    if (element.shadowRoot) {
      findCount =
        findCount + DoTaskForElements(element.shadowRoot, find, findRegex, ignoreCase, replace, check, highlight);
    }
  }
  return findCount;
}

function RemoveHighLightElements() {
  while (true) {
    let hightLightElements = document.getElementsByClassName("class_hl_find_and_replace");
    if (hightLightElements.length == 0) {
      break;
    }
    for (const element of hightLightElements) {
      const parentNode = element.parentNode;
      parentNode.replaceChild(element.firstChild, element);
      parentNode.normalize();
    }
  }
}

function FindTextAndDo(find, regex, ignoreCase, replace, check, highlight) {
  let findRegex = null;
  if (regex) {
    try {
      const mode = ignoreCase === true ? "i" : "";

      findRegex = new RegExp(`${find}`, mode);
    } catch (e) {
      return 0;
    }
  }
  return DoTaskForElements(document.body, find, findRegex, ignoreCase, replace, check, highlight);
}

function RepeatReplace(times) {
  if (times <= 4) {
    setTimeout(function () {
      chrome.storage.sync.get(null, function (result) {
        if (result != null) {
          for (const rules of Object.values(result)) {
            for (const [find, value] of Object.entries(rules)) {
              if (value.domain != null && value.domain != window.location.host) {
                continue;
              }
              if (value.runtype != "Auto") {
                continue;
              }
              if (value.disabled == true) {
                continue;
              }
              FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.replace, false, false);
            }
          }
        }
        RepeatReplace(times + 1);
      });
    }, times * 1000);
  }
}

function RealtimeReplace() {
  setTimeout(function () {
    try {
      chrome.storage.sync.get(null, function (result) {
        if (result != null) {
          for (const rules of Object.values(result)) {
            for (const [find, value] of Object.entries(rules)) {
              if (value.domain != null && value.domain != window.location.host) {
                continue;
              }
              if (value.runtype != "Realtime") {
                continue;
              }
              if (value.disabled == true) {
                continue;
              }
              FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.replace, false, false);
            }
          }
        }
        RealtimeReplace();
      });
    } catch (error) {
      console.error("RealtimeReplace error:", error);
    }
  }, 1500);
}

function main() {
  // commands
  const kRunRule = "run_rule";
  const kRunTest = "run_test";
  const kRunCheck = "run_check";
  const kHighLight = "run_highlight";

  const kCmd = "cmd";
  const kTmp = "tmp";

  chrome.storage.local.get([kCmd], function (result) {
    if (result[kCmd] == null) {
      RepeatReplace(1);
      RealtimeReplace();
    } else {
      RemoveHighLightElements();
      chrome.storage.local.remove(kCmd);
      const cmd = result[kCmd];
      if (cmd.type == kRunRule) {
        chrome.storage.sync.get(cmd.group, function (result) {
          let replaceCount = 0;
          for (const rules of Object.values(result)) {
            if (cmd.find == null) {
              for (const [find, value] of Object.entries(rules)) {
                if (value.domain != null && value.domain != window.location.host) {
                  continue;
                }
                if (value.disabled == true) {
                  continue;
                }
                replaceCount =
                  replaceCount +
                  FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.replace, false, false);
              }
            } else {
              const find = cmd.find;
              const value = rules[find];
              if (value.domain != null && value.domain != window.location.host) {
                continue;
              }
              if (value.disabled == true) {
                continue;
              }
              replaceCount =
                replaceCount +
                FindTextAndDo(find, value.regex === true, value.ignoreCase === true, value.replace, false, false);
              break;
            }
          }
          chrome.runtime.sendMessage({ replaceCount: replaceCount });
        });
      } else if (cmd.type == kRunTest) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          if (rule == null || rule.valid == false) {
            return;
          }
          const value = rule.value;
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          FindTextAndDo(rule.find, value.regex === true, value.ignoreCase === true, value.replace, false, false);
        });
      } else if (cmd.type == kRunCheck) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          let findCount = 0;
          if (rule == null || rule.valid == false) {
            findCount = 0;
          } else {
            const value = rule.value;
            if (value.domain != null && value.domain != window.location.host) {
              findCount = 0;
            } else {
              findCount = FindTextAndDo(
                rule.find,
                value.regex === true,
                value.ignoreCase === true,
                value.replace,
                true,
                false
              );
            }
          }
          chrome.runtime.sendMessage({ findCount: findCount });
        });
      } else if (cmd.type == kHighLight) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          if (rule == null || rule.valid == false) {
            return;
          }
          const value = rule.value;
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          FindTextAndDo(rule.find, value.regex === true, value.ignoreCase === true, value.replace, false, true);
        });
      }
    }
  });
}

main();

function exportRules() {
  chrome.storage.sync.get(null, function(items) {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importRules(event) {
  const file = event.target.files[0];
  if (!file) {
    console.log("No file selected.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const newRules = JSON.parse(e.target.result);
      console.log("New rules:", newRules);

      chrome.storage.sync.get(null, function(existingRules) {
        console.log("Existing rules before merging:", existingRules);

        // Объединяем правила
        const mergedRules = { ...existingRules };

        // Проходим по новым правилам
        for (const [key, newRule] of Object.entries(newRules)) {
          if (key in mergedRules) {
            // Если правило уже существует, логика объединения или замены
            console.log(`Rule for "${key}" exists. Merging or replacing it.`);
            mergedRules[key] = { ...mergedRules[key], ...newRule };
          } else {
            // Если правило новое, добавляем его
            mergedRules[key] = newRule;
          }
        }

        // Сохраняем объединенные правила
        chrome.storage.sync.set(mergedRules, function() {
          console.log("Rules have been imported, merged, and saved.");
          console.log("Updated rules:", mergedRules);
        });
      });
    } catch (error) {
      console.error("Error importing rules: ", error);
    }
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  const exportButton = document.getElementById("exportRulesButton");
  exportButton.addEventListener("click", exportRules);

  const importButton = document.getElementById("importRulesButton");
  const importInput = document.getElementById("importRulesInput");
  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", importRules);

  const showDescriptionButton = document.getElementById("showDescriptionButton");
  
  if (showDescriptionButton) {
    showDescriptionButton.addEventListener("click", function(event) {
      event.preventDefault();
      sendMessageToContentScript({ action: 'getDescriptionText' }, (response) => {
        if (response) {
          showDescriptionOverlay(response);
        } else {
          showDescriptionOverlay('Текст не найден');
        }
      });
    });
  }

  const descriptionOverlay = document.getElementById("descriptionOverlay");
  if (descriptionOverlay) {
    descriptionOverlay.addEventListener("click", () => {
      descriptionOverlay.style.display = "none";
    });
  }
});

// Content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getDescriptionText') {
    const pElements = document.querySelectorAll('div.wrapper > span > p, p');
    let allText = '';
    
    pElements.forEach(p => {
      allText += p.textContent + '\n';
    });

    sendResponse(allText.trim());
  }
});

function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, callback);
  });
}

function showDescriptionOverlay(text) {
  let descriptionOverlay = document.getElementById("descriptionOverlay");
  if (!descriptionOverlay) {
    descriptionOverlay = document.createElement("div");
    descriptionOverlay.id = "descriptionOverlay";
    descriptionOverlay.style.position = "fixed";
    descriptionOverlay.style.top = "0";
    descriptionOverlay.style.left = "0";
    descriptionOverlay.style.width = "100%";
    descriptionOverlay.style.height = "100%";
    descriptionOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    descriptionOverlay.style.color = "white";
    descriptionOverlay.style.padding = "20px";
    descriptionOverlay.style.boxSizing = "border-box";
    descriptionOverlay.style.overflowY = "auto";
    descriptionOverlay.style.zIndex = "10000";
    document.body.appendChild(descriptionOverlay);
  }

  descriptionOverlay.innerHTML = "<h1>Описание</h1><p style='max-width: calc(100% - 40px); margin: 0; padding-right: 20px; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap; box-sizing: border-box;'>" + text.replace(/\n/g, '<br>') + "</p>";
  descriptionOverlay.style.display = "block";

  console.log("Overlay displayed with text:", text);
}
