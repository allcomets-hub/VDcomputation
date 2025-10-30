function setup() {
  createCanvas(500, 500);
  noLoop();
  background(255, 230, 240); // 연핑크 배경
  drawKitty(250, 260, 1.2);
}

function drawKitty(cx, cy, s) {
  stroke(0);
  strokeWeight(6 * s);
  strokeJoin(ROUND);
  strokeCap(ROUND);
  fill(255);

  // 귀 (모아지고, 회전 각도 완만)
  const earW = 65 * s;
  const earH = 110 * s;

  push();
  translate(cx - 65 * s, cy - 50 * s);
  rotate(-PI / 7.2); // ≈ -25°
  arc(0, 0, earW, earH, PI, TWO_PI, CHORD);
  pop();

  push();
  translate(cx + 65 * s, cy - 50 * s);
  rotate(PI / 7.2);  // ≈ +25°
  arc(0, 0, earW, earH, PI, TWO_PI, CHORD);
  pop();

  // 얼굴
  ellipse(cx, cy, 220 * s, 180 * s);

  // 눈: 간격 넓힌 상태 유지
  fill(0);
  ellipse(cx - 55 * s, cy + 12 * s, 14 * s, 20 * s);
  ellipse(cx + 55 * s, cy + 12 * s, 14 * s, 20 * s);

  // 코
  fill(255, 204, 0);
  ellipse(cx, cy + 34 * s, 22 * s, 16 * s);

  // 수염: 길이 동일, 눈과 안 겹치게 좌우로 평행 이동(≈ +10px)
  stroke(0); strokeWeight(6 * s);
  // 왼쪽 (시작/끝 x를 모두 -10 더 감소 → 바깥쪽으로 이동)
  line(cx - 74 * s, cy + 18 * s,  cx - 120 * s, cy + 6 * s);
  line(cx - 74 * s, cy + 32 * s,  cx - 120 * s, cy + 32 * s);
  line(cx - 74 * s, cy + 46 * s,  cx - 120 * s, cy + 58 * s);
  // 오른쪽 (시작/끝 x를 모두 +10 증가 → 바깥쪽으로 이동)
  line(cx + 74 * s, cy + 18 * s,  cx + 120 * s, cy + 6 * s);
  line(cx + 74 * s, cy + 32 * s,  cx + 120 * s, cy + 32 * s);
  line(cx + 74 * s, cy + 46 * s,  cx + 120 * s, cy + 58 * s);

  // 리본 (왼쪽·아래 위치 유지)
  fill(200, 0, 0);
  strokeWeight(6 * s);
  ellipse(cx + 50 * s, cy - 70 * s, 54 * s, 42 * s);
  ellipse(cx + 92 * s, cy - 54 * s, 54 * s, 42 * s);
  fill(255, 60, 60);
  ellipse(cx + 72 * s, cy - 62 * s, 30 * s, 30 * s);
}

