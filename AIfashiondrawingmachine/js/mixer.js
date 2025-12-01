// Generate Prompt
document.getElementById("generateBtn").addEventListener("click", () => {
    let mood = document.getElementById("moodSelect").value;
    let pattern = document.getElementById("patternSelect").value;

    let c1 = document.getElementById("color1").value;
    let c2 = document.getElementById("color2").value;
    let c3 = document.getElementById("color3").value;

    let prompt = `
high-fashion runway show, model walking confidently on the catwalk,
full-body mid-stride pose, dynamic movement,
Paris Fashion Week environment, long runway perspective,
audience on both sides, glossy reflective runway floor,
fashion show spotlighting, dramatic cinematic lighting,
mood: ${mood},
color palette: ${c1}, ${c2}, ${c3},
pattern style: ${pattern},
shot from front-row photographer perspective,
8k ultra-detailed, fashion runway photography
`.trim();

    document.getElementById("promptOutput").value = prompt;
});

// Copy prompt
document.getElementById("copyBtn").addEventListener("click", () => {
    let text = document.getElementById("promptOutput");
    text.select();
    navigator.clipboard.writeText(text.value);
    alert("Prompt copied!");
});

/* -----------------------------------------
   Runway Image Drag & Drop + LocalStorage 저장
-------------------------------------------- */

// 이미지 저장 키
const STORAGE_KEY = "runwayImages";

// DOM elements
let dropzone = document.getElementById("dropzone");
let gallery = document.getElementById("gallery");

/* ---------- 1) 페이지 로드 시 저장된 이미지 복원 ---------- */
window.addEventListener("DOMContentLoaded", () => {
    let savedImages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    savedImages.forEach(src => {
        addImageToGallery(src);
    });
});

/* ---------- 2) 드래그 오버 시 배경 강조 ---------- */
dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.background = "#efefef";
});

/* ---------- 3) 드래그가 떠났을 때 ---------- */
dropzone.addEventListener("dragleave", () => {
    dropzone.style.background = "transparent";
});

/* ---------- 4) 드롭하면 이미지 저장 + 표시 ---------- */
dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.background = "transparent";

    let files = e.dataTransfer.files;

    for (let file of files) {
        let reader = new FileReader();
        reader.onload = (event) => {
            let imgSource = event.target.result;

            // 1) 갤러리에 추가
            addImageToGallery(imgSource);

            // 2) LocalStorage에 추가
            saveImageToLocalStorage(imgSource);
        };
        reader.readAsDataURL(file);
    }
});

/* ---------- Helper: 갤러리에 이미지 추가 ---------- */
function addImageToGallery(src) {
    let img = document.createElement("img");
    img.src = src;
    img.className = "gallery-img";
    gallery.appendChild(img);
}

/* ---------- Helper: LocalStorage에 이미지 저장 ---------- */
function saveImageToLocalStorage(src) {
    let savedImages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    savedImages.push(src);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedImages));
}
