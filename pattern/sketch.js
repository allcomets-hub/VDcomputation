// ===== 기본 설정 =====
const CANVAS = 1080;
const GRID   = 12;                     // 체크보드 칸 수
const CELL   = CANVAS / GRID;

// 체크보드 색
const C_BLUE   = '#86B9F6';
const C_GREEN  = '#6FA58E';
const BG       = '#F4F6F8';

// 별 색(두 가지가 번갈아가며 배치됨)
const STAR_A   = '#FFFFFF';
const STAR_B   = '#612A1D';

// 별 모양 파라미터
const STAR_POINTS = 16;                // 톱니 개수
const STAR_OUTER  = 0.32 * CELL;       // 바깥 반지름(기본)
const STAR_INNER  = 0.13 * CELL;       // 안쪽 반지름

// "선 위"로 통째 이동할 오프셋(왼쪽·아래로)
const STAR_OFFSET = { x: -0.01 * CELL, y: 0.04 * CELL };

// 깜빡임(블링크) 설정
const FPS        = 30;
const BLINK_MIN  = 0.65;               // 최소 스케일/알파
const BLINK_MAX  = 1.25;               // 최대 스케일
const ALPHA_MIN  = 60;                // 최소 불투명도
const ALPHA_MAX  = 255;                // 최대 불투명도

let stars = [];

function setup() {
  createCanvas(CANVAS, CANVAS);
  frameRate(FPS);
  noStroke();
  rectMode(CORNER);

  // 1) 별 좌표 미리 생성 (격자 "선"의 교차점 근처, 지그재그로 2칸 간격)
  //    gx, gy는 1..GRID-1 (캔버스 안쪽의 선만 사용)
  for (let gy = 1; gy < GRID; gy += 2) {
    // 지그재그: 줄마다 시작 x 를 한 칸 밀기
    const startX = (gy % 4 === 1) ? 1 : 2;
    for (let gx = startX; gx < GRID; gx += 2) {
      const baseX = gx * CELL;
      const baseY = gy * CELL;
      const cx = baseX + STAR_OFFSET.x;
      const cy = baseY + STAR_OFFSET.y;

      stars.push({
        x: cx,
        y: cy,
        // 인접한 별들이 번갈아 깜빡이도록 랜덤 위상/속도
        phase: random(TWO_PI),
        speed: random(0.8, 1.6),  // 속도 다르게
        color: (gx + gy) % 4 === 0 || (gx + gy) % 4 === 3 ? STAR_A : STAR_B
      });
    }
  }
}

function draw() {
  // 2) 체크보드 배경
  background(BG);
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const x = gx * CELL, y = gy * CELL;
      fill(((gx + gy) % 2 === 0) ? C_BLUE : C_GREEN);
      rect(x, y, CELL, CELL);

      // (선택) 약한 텍스처
      push();
      const texAlpha = 10;
      stroke(255, texAlpha);
      for (let i = 3; i < CELL; i += CELL / 12) {
        line(x + i, y + 2, x + i, y + CELL - 2);
      }
      pop();
    }
  }

  // 3) 별 깜빡이기 + 그리기
  for (const s of stars) {
    // 무작위 위상/속도로 부드럽게 깜빡 (이웃이 서로 어긋남)
    const t = frameCount * 0.06 * s.speed + s.phase;
    // 사인파 + 약간의 노이즈로 "무작위" 느낌 강화
    const n = noise(s.x * 0.01, s.y * 0.01, frameCount * 0.02);
    const k = map(sin(t) * 0.7 + (n - 0.5) * 0.6, -1, 1, BLINK_MIN, BLINK_MAX);
    const a = map(k, BLINK_MIN, BLINK_MAX, ALPHA_MIN, ALPHA_MAX);

    const rOut = STAR_OUTER * k;   // 크기 변화
    const rIn  = STAR_INNER * k;

    drawStar(s.x, s.y, rOut, rIn, STAR_POINTS, s.color, a);
  }
}

// 별 그리기
function drawStar(cx, cy, rOuter, rInner, nPoints, col, alphaVal = 255) {
  push();
  translate(cx, cy);
  rotate(-PI / 2);
  fill(color(col + hexAlpha(alphaVal))); // HEX + 알파 적용
  beginShape();
  for (let i = 0; i < nPoints * 2; i++) {
    const angle = (PI * i) / nPoints;
    const r = (i % 2 === 0) ? rOuter : rInner;
    vertex(r * cos(angle), r * sin(angle));
  }
  endShape(CLOSE);
  pop();
}

// HEX 색에 알파(0~255)를 붙여주는 헬퍼 (#RRGGBBAA)
function hexAlpha(a) {
  const v = constrain(floor(a), 0, 255);
  const h = v.toString(16).padStart(2, '0').toUpperCase();
  return h;
}

// 키: S 키로 GIF 저장 (5초, 30fps)
function keyPressed() {
  if (key === 'S' || key === 's') {
    // 3초 동안, 30fps
    saveGif('myStarPattern', 3, { fps: FPS });
  }
}