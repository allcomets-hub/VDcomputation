// ---- Cake Brush (최소 동작 보장) ----
let img;
let cnv;

// 사용자 설정
let stampScale = 0.05;   // 이미지 크기 배율
let spacing    = 28;     // 스탬프 간격
let alignToMotion = true;
let jitter = 0;          // 각도 랜덤(도)

// 내부 상태
let lastX, lastY;
let haveLast = false;

function preload(){
  // index.html과 같은 폴더에 cake.jpg 있어야 함!
  img = loadImage('cake.jpg', 
    () => console.log('cake.jpg loaded:', img.width, img.height),
    (e) => console.error('이미지 로드 실패', e)
  );
}

function setup(){
  cnv = createCanvas(windowWidth, windowHeight);
  background(255);
  imageMode(CENTER);
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed(){
  lastX = mouseX;
  lastY = mouseY;
  haveLast = true;
}

function mouseDragged(){
  if (!haveLast || !img) return;

  let dx = mouseX - lastX;
  let dy = mouseY - lastY;
  let distSeg = Math.hypot(dx, dy);
  if (distSeg === 0) return;

  let w = img.width * stampScale;
  let h = img.height * stampScale;

  let baseGap = Math.max(10, Math.min(w, h) * 0.55);
  let gap = Math.max(8, (spacing || baseGap));

  for (let d = 0; d <= distSeg; d += gap) {
    let t = d / distSeg;
    let x = lerp(lastX, mouseX, t);
    let y = lerp(lastY, mouseY, t);

    let angle = alignToMotion ? Math.atan2(dy, dx) : 0;
    if (jitter > 0) angle += radians(random(-jitter, jitter));

    push();
    translate(x, y);
    rotate(angle);
    image(img, 0, 0, w, h);
    pop();
  }

  let leftover = distSeg % gap;
  let ux = dx / distSeg, uy = dy / distSeg;
  lastX = mouseX - ux * leftover;
  lastY = mouseY - uy * leftover;
}

function mouseReleased(){
  haveLast = false;
}

function keyPressed(){
  if (key === 's' || key === 'S') { saveCanvas(cnv, 'cakeBrush', 'png'); return false; }
  if (key === ' ') { background(255); return false; }
  if (key === ']') stampScale = Math.min(2.0, stampScale + 0.05);
  if (key === '[') stampScale = Math.max(0.05, stampScale - 0.05);
  if (key === '}') spacing    = Math.min(120, spacing + 4);
  if (key === '{') spacing    = Math.max(4, spacing - 4);
  if (key === 'a' || key === 'A') alignToMotion = !alignToMotion;
  if (key === 'j' || key === 'J') jitter = jitter === 0 ? 8 : (jitter === 8 ? 16 : 0);
}
