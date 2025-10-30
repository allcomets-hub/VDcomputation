// ---- 랜덤하게 계속 변하는 타일 패턴 (p5.js) ----
const CANVAS = 1080;
const GRID   = 10;                // 타일 갯수 (가로/세로)
const CELL   = CANVAS / GRID;     // 한 칸 크기
const SPEED  = 0.9;              // 애니메이션 속도 (값↑ 빠름)
const NS     = 0.018;             // 노이즈 스케일 (값↓ 크고 느슨한 무늬)

function setup() {
  createCanvas(CANVAS, CANVAS);
  noStroke();
  rectMode(CENTER);
  // 예쁜 색 변화를 위해 HSB 사용
  colorMode(HSB, 360, 100, 100, 100);
}

function draw() {
  background(0, 0, 98); // 아주 옅은 아이보리 배경

  const t = frameCount * SPEED * 0.01; // 시간

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x = gx * CELL + CELL / 2;
      const y = gy * CELL + CELL / 2;

      // ----- 1) 타일 바닥색: 노이즈로 두 색 사이를 부드럽게 전환
      const n = noise(gx * NS, gy * NS, t);  // 0..1
      // 두 기준 색상(하늘/민트) 사이를 보간
      const hueA = 205, hueB = 155;          // H (파랑↔연녹)
      const satA = 45,  satB = 35;           // S
      const briA = 85,  briB = 80;           // B
      const h = lerp(hueA, hueB, n);
      const s = lerp(satA, satB, n);
      const b = lerp(briA, briB, n);

      push();
      translate(x, y);
      fill(h, s, b);
      rect(0, 0, CELL, CELL);
      pop();

      // ----- 2) 모티프(별/핀휠/원+정사각형) 중 하나를 노이즈로 선택
      const n2 = noise(gx * NS + 100, gy * NS + 100, t * 1.3);
      const motifType = n2 < 0.33 ? 'star' : (n2 < 0.66 ? 'pinwheel' : 'duo');

      // 공통: 회전/크기도 살짝 요동
      const n3 = noise(gx * NS + 200, gy * NS + 200, t * 1.7);
      const rot = map(n3, 0, 1, -PI/6, PI/6);           // -30°~30°
      const scaleK = map(n3, 0, 1, 0.75, 1.15);         // 크기 요동

      // 포그라운드 색상(보라 계열 ↔ 핑크 계열)도 천천히 변환
      const hueC = 285, hueD = 330;                     // 보라↔핑크
      const sC = 55,  sD = 60;
      const bC = 95,  bD = 90;
      const k = noise(gx * NS - 50, gy * NS - 50, t * 0.7);
      const hc = lerp(hueC, hueD, k);
      const sc = lerp(sC, sD, k);
      const bc = lerp(bC, bD, k);

      push();
      translate(x, y);
      rotate(rot);
      scale(scaleK);
      noStroke();

      if (motifType === 'star') {
        // 별: 점멸 느낌(알파/크기)을 사인+노이즈로
        const blink = 0.6 + 0.4 * sin(t * 3 + gx + gy);
        fill(hc, sc, bc, 75 + 25 * blink * 100);
        drawStar(0, 0, CELL * 0.34 * (0.9 + 0.2 * blink), CELL * 0.14, 16);
      } else if (motifType === 'pinwheel') {
        // 핀휠: 사분면 회전 사각형
        fill(hc, sc, bc, 92);
        for (let i = 0; i < 4; i++) {
          push();
          rotate((PI / 2) * i + t * 0.6);
          rect(CELL * 0.14, 0, CELL * 0.22, CELL * 0.08, 3);
          pop();
        }
        // 중심점
        fill(hc, sc, 100, 100);
        circle(0, 0, CELL * 0.08);
      } else {
        // duo: 원 + 정사각형
        fill(hc, sc, bc, 90);
        circle(0, 0, CELL * 0.50);
        fill(hc, sc, 100, 100);
        rect(0, 0, CELL * 0.42, CELL * 0.42, 8);
      }
      pop();
    }
  }
}

// 별 그리기 유틸
function drawStar(cx, cy, rOuter, rInner, points) {
  push();
  translate(cx, cy);
  rotate(-PI / 2);
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    const ang = (PI * i) / points;
    const r = (i % 2 === 0) ? rOuter : rInner;
    vertex(r * cos(ang), r * sin(ang));
  }
  endShape(CLOSE);
  pop();
}

function keyPressed() {
 if (key === 's') {
   saveGif('myPattern', 5); // Saves a 5-second GIF
 }
}
