let rainbow = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#8f00ff'];
let offsets = [-6, -4, -2, 0, 2, 4, 6];

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255);
  strokeWeight(2);
}

function draw() {
  if (mouseIsPressed) {

    // direction of motion
    let dx = mouseX - pmouseX;
    let dy = mouseY - pmouseY;
    // perpendicular unit vector (-dy, dx)
    let mag = sqrt(dx*dx + dy*dy);
    let px = 0, py = 0;
    if (mag > 0) {
      px = -dy / mag;
      py =  dx / mag;
    }

    for (let i = 0; i < rainbow.length; i++) {
      stroke(rainbow[i]);
      let off = offsets[i];
      let x1 = pmouseX + px * off;
      let y1 = pmouseY + py * off;
      let x2 =  mouseX + px * off;
      let y2 =  mouseY + py * off;
      line(x1, y1, x2, y2);
    }
  }
}

let cnv;

function setup() {
  cnv = createCanvas(windowWidth, windowHeight);
  background(255);
}

function keyPressed() {
  // 저장: s / S
  if (key === 's' || key === 'S') {
    saveCanvas(cnv, 'myCanvas', 'png');
    return false; // 브라우저 기본동작 방지
  }
  // 초기화: Space
  if (key === ' ') {
    background(255);
    return false; // 기본동작(스크롤) 방지
  }
}
