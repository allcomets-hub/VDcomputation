/* ----------------------------------------
   CUSTOM DROPDOWN
-----------------------------------------*/

document.querySelectorAll(".dropdown").forEach(drop => {
    const selected = drop.querySelector(".dropdown-selected");
    const options = drop.querySelector(".dropdown-options");

    selected.addEventListener("click", () => {
        drop.classList.toggle("open");
    });

    options.querySelectorAll(".option").forEach(opt => {
        opt.addEventListener("click", () => {
            selected.textContent = opt.textContent;
            drop.classList.remove("open");
        });
    });
});

document.addEventListener("click", (e) => {
    document.querySelectorAll(".dropdown").forEach(drop => {
        if (!drop.contains(e.target)) drop.classList.remove("open");
    });
});


/* ----------------------------------------
   GENERATE PROMPT
-----------------------------------------*/

document.getElementById("generateBtn").addEventListener("click", () => {

    const mood = document.querySelector('[data-type="mood"] .dropdown-selected').textContent.trim();
    const pattern = document.querySelector('[data-type="pattern"] .dropdown-selected').textContent.trim();

    const c1 = document.getElementById("color1").value;
    const c2 = document.getElementById("color2").value;
    const c3 = document.getElementById("color3").value;

    const output = document.getElementById("promptOutput");

output.value =
`High-fashion editorial concept featuring:
- Mood: ${mood}
- Textile: ${pattern}
- Color palette: ${c1}, ${c2}, ${c3}
- Image format: square 1:1 250px, centered, crisp edges.
Generate the image inside a perfect square frame (1:1 aspect ratio).  
Do not crop the model. Keep the head-to-toe framing within the square.  

Full-body model with clearly visible face, natural proportions, photographed mid-stride on the runway.

High-resolution garment texture, natural folds, true-to-life fabric movement.
Sharp lens focus, shallow depth of field, cinematic contrast.
No surreal effects, no fantasy elements, realistic proportions, authentic human skin texture.

Shot on DSLR camera, 85mm lens, ISO 800, shutter 1/250, backstage color grading.
Editorial detail, clean shadows, runway floor reflections.`;
});




/* ----------------------------------------
   COPY & OPEN GEMINI
-----------------------------------------*/

document.getElementById("copyBtn").addEventListener("click", () => {
    const text = document.getElementById("promptOutput");
    text.select();
    document.execCommand("copy");

    window.open(
        "https://gemini.google.com/app?hl=ko-KR",
        "_blank"
    );
});


/* ----------------------------------------
   DRAG & DROP IMAGE PREVIEW
-----------------------------------------*/

const dropzone = document.getElementById("dropzone");
const gallery = document.getElementById("gallery");

dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.background = "#f0f0f0";
});

dropzone.addEventListener("dragleave", () => {
    dropzone.style.background = "white";
});

dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.background = "white";

    const files = e.dataTransfer.files;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = document.createElement("img");
            img.src = reader.result;
            gallery.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});
