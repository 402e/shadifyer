"use strict";
const DEFAULT_MAIN_COLOR = "#f9d381";
const DEFAULT_HUE_DELTA = 15;
const DEFAULT_SATURATION_DELTA = 10;
const DEFAULT_BRIGHTNESS_DELTA = 5;
const DEFAULT_COUNT = 5;

const submitButton = document.getElementById("submit");
const mainColorButton = document.getElementById("main-color-button");
const settingsBlock = document.getElementById("settings-block");
const codeBlock = document.getElementById("code-block");
const codeElement = document.getElementById("code-element");

let isGenerated = false;
let isResetting = false;

const inputs = {
    mainColor: {
        element: document.getElementById("main-color"),
        defaultValue: DEFAULT_MAIN_COLOR,
    },
    hue: {
        element: document.getElementById("hue"),
        defaultValue: DEFAULT_HUE_DELTA,
    },
    saturation: {
        element: document.getElementById("saturation"),
        defaultValue: DEFAULT_SATURATION_DELTA,
    },
    brightness: {
        element: document.getElementById("brightness"),
        defaultValue: DEFAULT_BRIGHTNESS_DELTA,
    },
    resultsCount: {
        element: document.getElementById("results-count"),
        defaultValue: DEFAULT_COUNT,
    },
};

for (const key in inputs) {
    inputs[key].element.placeholder = inputs[key].defaultValue;
}

if (inputs.mainColor.element.value) {
    let value = inputs.mainColor.element.value;
    mainColorButton.value = value;
    checkMainColorButton(value);
} else {
    mainColorButton.value = DEFAULT_MAIN_COLOR;
}

function validateHex(hex) {
    const hexColorPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
    if (hex === "" || hexColorPattern.test(hex)) {
        return true;
    }
}

function normalizeHex(hex) {
    // #RGB → #RRGGBB
    if (hex.length === 4) {
        hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex.toLowerCase();
}

function checkMainColorButton(value) {
    if (validateHex(value)) {
        mainColorButton.value = normalizeHex(value);
        mainColorButton.classList.remove("form__color-button_invalid");
    } else {
        mainColorButton.classList.add("form__color-button_invalid");
    }
}

function validateForm() {
    const colorValue = inputs.mainColor.element.value.trim();

    if (!validateHex(colorValue)) {
        alert("Invalid hex color");
        return false;
    }

    let hue = null;
    let saturation = null;
    let brightness = null;

    for (const key in inputs) {
        if (key === "mainColor") continue;

        const { element } = inputs[key];
        if (!element) continue;

        const value = element.value.trim();
        if (value === "") continue;

        const number = element.valueAsNumber;
        if (isNaN(number)) {
            alert(`Invalid ${key} value`);
            return false;
        }

        if (key === "resultsCount" && number <= 0) {
            alert("Quantity must be greater than 0");
            return false;
        }

        if (key === "hue") hue = number;
        if (key === "saturation") saturation = number;
        if (key === "brightness") brightness = number;
    }

    if (hue === 0 && saturation === 0 && brightness === 0) {
        alert("Can't generate without delta values!");
        return false;
    }

    return true;
}

function hexToHSB(hex) {
    hex = normalizeHex(hex);
    hex = hex.replace(/^#/, "");

    // Parse r, g, b (range 0–1)
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let delta = max - min;

    // Calculate Hue
    let h;
    if (delta === 0) {
        h = 0;
    } else {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    // Calculate Saturation (HSV)
    let s = max === 0 ? 0 : (delta / max) * 100;

    // Brightness (Value) is the max component in percentage
    let v = max * 100;

    return {
        hue: Math.round(h),
        saturation: Math.round(s),
        brightness: Math.round(v),
    };
}

function hsbToHex(h, s, v) {
    s = s / 100;
    v = v / 100;

    let c = v * s;
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = v - c;

    let r, g, b;

    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else {
        r = c;
        g = 0;
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value) {
    const hex = value.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

function adjustHue(hue, hueDelta, type) {
    let anchors;
    if (type === "light") {
        anchors = [60, 180, 300];
    } else if (type === "shadow") {
        anchors = [0, 120, 240];
    }

    let closest = anchors[0];
    let minDistance = Math.abs(hue - anchors[0]);

    for (let i = 1; i < anchors.length; i++) {
        const distance = Math.abs(hue - anchors[i]);
        if (distance < minDistance) {
            minDistance = distance;
            closest = anchors[i];
        }
    }

    if (hue === closest) return hue;

    // Move toward the closest anchor
    const direction = closest > hue ? 1 : -1;
    let newHue = hue + hueDelta * direction;

    // Clamp to the anchor if surpassed
    if (
        (direction > 0 && newHue >= closest) ||
        (direction < 0 && newHue <= closest)
    ) {
        newHue = closest;
    }

    return (newHue + 360) % 360;
}

function generateCSSVariables(mainColor, lightColors, shadowColors) {
    let result = "";

    for (let i = lightColors.length; i > 0; i--) {
        result += `--light-${i}: ${lightColors[i - 1]};\n`;
    }

    result += `--main-color: ${mainColor};\n`;

    for (let i = 0; i < shadowColors.length; i++) {
        result += `--shadow-${i + 1}: ${shadowColors[i]};\n`;
    }

    return result;
}

function generateColor(values, shouldGenerateLight, shouldGenerateShadow) {
    const { hue, saturation, brightness } = hexToHSB(values.mainColor);

    function isWhiteColor(saturation, brightness) {
        return brightness >= 99 && saturation <= 1;
    }
    function isBlackColor(brightness) {
        return brightness <= 1;
    }

    if (isWhiteColor(saturation, brightness)) {
        shouldGenerateLight = false;
        if (!shouldGenerateShadow) {
            alert("Can't generate light for white.");
            return;
        }
    }
    if (isBlackColor(brightness)) {
        shouldGenerateShadow = false;
        if (!shouldGenerateLight) {
            alert("Can't generate shadow for black.");
            return;
        }
    }

    const isGrayBase = saturation <= 1;

    let lightColors = [];
    let shadowColors = [];

    if (shouldGenerateLight) {
        let newHue = hue;
        let newSaturation = saturation;
        let newBrightness = brightness;
        let type = "light";

        let prevColor = null;

        for (let i = 1; i <= values.count; i++) {
            if (!isGrayBase) {
                newHue = adjustHue(newHue, values.hueDelta, type);
                newSaturation = Math.max(
                    0,
                    newSaturation - values.saturationDelta,
                );
            } else {
                newSaturation = 0;
            }
            newBrightness = Math.min(
                100,
                newBrightness + values.brightnessDelta,
            );

            const newColor = hsbToHex(newHue, newSaturation, newBrightness);

            if (newColor === prevColor) {
                break;
            }

            lightColors.push(newColor);
            prevColor = newColor;

            if (isWhiteColor(newSaturation, newBrightness)) {
                break;
            }
        }

        generateColorsElement(lightColors, "light");
    }

    if (shouldGenerateShadow) {
        let newHue = hue;
        let newSaturation = saturation;
        let newBrightness = brightness;
        let type = "shadow";

        let prevColor = null;

        for (let i = 1; i <= values.count; i++) {
            if (!isGrayBase) {
                newHue = adjustHue(newHue, values.hueDelta, type);
                newSaturation = Math.min(
                    100,
                    newSaturation + values.saturationDelta,
                );
            } else {
                newSaturation = 0;
            }
            newBrightness = Math.max(0, newBrightness - values.brightnessDelta);

            const newColor = hsbToHex(newHue, newSaturation, newBrightness);

            if (newColor === prevColor) {
                break;
            }

            shadowColors.push(newColor);
            prevColor = newColor;

            if (isBlackColor(newBrightness)) {
                break;
            }
        }

        generateColorsElement(shadowColors, "shadow");
    }
    const cssVariables = generateCSSVariables(
        values.mainColor,
        lightColors,
        shadowColors,
    );
    codeElement.textContent = cssVariables;
}

function generateColorsElement(colors, type) {
    function getColorTemplate(color, count) {
        return `<div class="form__field form__field_generated">
                    <label for="${type}#${count}" class="label">${type}-${count} :</label>
                    <input type="text" id="${type}#${count}" value="${color}" class="text-input color-input" readonly>
                    <div class="form__color" style="background:${color}"></div>
                </div>`;
    }
    const mainInput = inputs.mainColor.element;
    const parent = mainInput.closest(".form__part");

    if (!mainInput.value) {
        mainInput.value = inputs.mainColor.defaultValue;
    }
    mainInput.readOnly = true;
    mainColorButton.disabled = true;
    submitButton.textContent = "Clear";

    settingsBlock.hidden = true;
    codeBlock.hidden = false;

    for (let i = 0; i < colors.length; i++) {
        const html = getColorTemplate(colors[i], i + 1);
        const target = type === "light" ? "afterbegin" : "beforeend";
        parent.insertAdjacentHTML(target, html);
    }
}

function startColorGeneration() {
    if (!validateForm()) return;

    const shouldGenerateShadow = !document.getElementById("mode-light").checked;
    const shouldGenerateLight = !document.getElementById("mode-shadow").checked;

    function getInputValue(key) {
        const input = inputs[key].element;
        const defaultValue = inputs[key].defaultValue;
        const value = input.value.trim();
        if (value === "") return defaultValue;
        if (key === "mainColor") return value;
        const number = Number(value);
        return isNaN(number) ? defaultValue : number;
    }

    const values = {
        mainColor: getInputValue("mainColor"),
        hueDelta: getInputValue("hue"),
        saturationDelta: getInputValue("saturation"),
        brightnessDelta: getInputValue("brightness"),
        count: getInputValue("resultsCount"),
    };

    generateColor(values, shouldGenerateLight, shouldGenerateShadow);

    isGenerated = true;
}

function clearForm() {
    settingsBlock.hidden = false;
    codeBlock.hidden = true;

    const fields = document.querySelectorAll(".form__field_generated");
    fields.forEach(function(field) {
        field.remove();
    });
    inputs.mainColor.element.readOnly = false;
    mainColorButton.disabled = false;
    submitButton.textContent = "Generate";

    isGenerated = false;
}

mainColorButton.addEventListener("change", function() {
    if (mainColorButton.disabled) return;
    let value = mainColorButton.value;
    inputs.mainColor.element.value = value;
    checkMainColorButton(value);
});

inputs.mainColor.element.addEventListener("input", function() {
    let value = this.value;
    if (/^[\da-f]{3}$|^[\da-f]{6}$/i.test(value)) {
        value = "#" + value;
        this.value = value;
    }
    if (!value) value = DEFAULT_MAIN_COLOR;
    checkMainColorButton(value);
});

submitButton.addEventListener("click", function(e) {
    e.preventDefault();
    !isGenerated ? startColorGeneration() : clearForm();
});

document.getElementById("copy").addEventListener("click", function(e) {
    e.preventDefault();

    const button = this;
    const originalText = button.textContent;

    navigator.clipboard
        .writeText(codeElement.textContent)
        .then(() => {
            button.classList.add("button_done");
            button.textContent = "Copied";
            if (!isResetting) {
                isResetting = true;
                setTimeout(() => {
                    button.classList.remove("button_done");
                    button.textContent = originalText;
                    isResetting = false;
                }, 3000);
            }
        })
        .catch(() => alert("Failed to copy"));
});

document.getElementById("download").addEventListener("click", function(e) {
    e.preventDefault();

    const blob = new Blob([codeElement.textContent], { type: "text/css" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "styles.css";

    link.addEventListener("click", () => {
        setTimeout(() => URL.revokeObjectURL(url), 0); // Clean up URL after download
    });
    link.click();
});
