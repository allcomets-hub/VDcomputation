// 이 파일은 tanned-kitty 폴더 안에 있음
// 이미지도 같은 폴더 안에 있으므로 경로를 './' 없이 파일명만 사용

const BODY_FILE = "body.png";
const FACE_FILES = ["face-01.png","face-02.png","face-03.png","face-04.png"];

const CANVAS_W = 700, CANVAS_H = 700;
const BG = [255, 230, 240];
const FACE_OFFSET = { x: 0, y: -40 };

let imgBody, imgFaces = [], faceIndex = 0;

function preload() {
  imgBody = loadImage(BODY_FILE);
  imgFaces = FACE_FILES.map(n => loadImage(n));
}

function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  faceIndex = floor(random(imgFaces.length));

  const btn = createButton("🔀 Change Face");
  btn.position(10, 10);
  btn.mousePressed(nextRandomFace);

  const c = document.querySelector("canvas");
  if (c) c.addEventListener("click", nextRandomFace);
}

function draw() {
  background(...BG);

  const bodyX = width/2 - imgBody.width/2;
  const bodyY = height/2 - imgBody.height/2;
  image(imgBody, bodyX, bodyY);

  const face = imgFaces[faceIndex];
  const faceX = width/2 - face.width/2 + FACE_OFFSET.x;
  const faceY = height/2 - face.height/2 + FACE_OFFSET.y;
  image(face, faceX, faceY);
}

function nextRandomFace() {
  let next = floor(random(imgFaces.length));
  if (next === faceIndex && imgFaces.length > 1) next = (next + 1) % imgFaces.length;
  faceIndex = next;
}
