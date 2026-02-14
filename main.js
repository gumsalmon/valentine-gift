const introScreen = document.getElementById('intro-screen');
const contentLeft = document.getElementById('content-left');
const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');

const mainFooter = document.getElementById('main-footer');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- MENU ---
const hamburger = document.getElementById('hamburger');
const sidebar = document.querySelector('.glass-sidebar');
if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        sidebar.classList.toggle('active');
    });
}

// --- LÁ TRÁI TIM CAO CẤP ---
const leafCanvas = document.createElement('canvas');
leafCanvas.width = 60; leafCanvas.height = 60;
const lctx = leafCanvas.getContext('2d');

const leafGrad = lctx.createRadialGradient(25, 20, 2, 30, 30, 35);
leafGrad.addColorStop(0, '#ffccd5');
leafGrad.addColorStop(0.5, '#ff758f');
leafGrad.addColorStop(1, '#c9184a');

lctx.fillStyle = leafGrad;
lctx.shadowColor = 'rgba(128, 0, 32, 0.5)';
lctx.shadowBlur = 6;
lctx.shadowOffsetX = 1;
lctx.shadowOffsetY = 3;

lctx.beginPath();
lctx.moveTo(30, 18);
lctx.bezierCurveTo(30, 10, 20, 5, 10, 15);
lctx.bezierCurveTo(0, 30, 30, 50, 30, 55);
lctx.bezierCurveTo(30, 50, 60, 30, 50, 15);
lctx.bezierCurveTo(40, 5, 30, 10, 30, 18);
lctx.fill();

// --- HÀM TẠM DỪNG THỜI GIAN (GIÚP CÂY MỌC CHẬM) ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- STATE MACHINE ---
let state = 'WAITING';
let seed = { x: 0, y: 0, radius: 15, speed: 0, glow: 0 };
let groundY = 0;
let groundWidth = 0;

const leaves = [];
const branches = [];
// Gán lại = 8 để cành thoáng đãng, không bị rối mắt
const MAX_DEPTH = 8;

class Leaf {
    constructor(x, y, targetSize) {
        this.x = x + (Math.random() - 0.5) * 15;
        this.y = y + (Math.random() - 0.5) * 15;
        this.targetSize = targetSize;
        this.size = 0;
        this.angle = (Math.random() - 0.5) * Math.PI * 0.4;
        this.isFalling = false;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = 0.3 + Math.random() * 0.8;
        this.spin = (Math.random() - 0.5) * 0.01;
    }
    update() {
        // NỞ HOA CỰC CHẬM (giảm từ 0.2 xuống 0.04)
        if (!this.isFalling && this.size < this.targetSize) this.size += 0.04;

        if (!this.isFalling && this.size >= this.targetSize && Math.random() < 0.0002) this.isFalling = true;
        if (this.isFalling) {
            this.x += this.vx; this.y += this.vy; this.angle += this.spin;
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if (this.isFalling) ctx.globalAlpha = 0.8;
        ctx.drawImage(leafCanvas, -this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

// --- THUẬT TOÁN CÂY MỌC TỪ TỪ VÀ THÂN THẲNG 90 ĐỘ ---
async function buildTree(x, y, len, angle, depth) {
    // Nếu là cành đầu tiên (Thân gốc), khóa cứng độ cong = 0 để thẳng tắp 90 độ
    const curve = (depth === MAX_DEPTH) ? 0 : (Math.random() - 0.5) * 0.25;

    const endX = x + len * Math.cos(angle + curve);
    const endY = y + len * Math.sin(angle + curve);

    branches.push({
        x0: x, y0: y, x1: endX, y1: endY,
        depth: depth,
        // CÂY DÀY DẶN VÀ VỮNG CHÃI HƠN (nhân 2.5 thay vì 1.5)
        thickness: depth * 2.5 + 2
    });

    // MỌC CÀNH CHẬM RÃI (Dừng 80 mili-giây ở mỗi cành)
    await sleep(80);

    if (depth === 0) {
        for (let i = 0; i < 3; i++) leaves.push(new Leaf(endX, endY, 20 + Math.random() * 12));
        return;
    }

    // Rất ít lá ở cành giữa để tránh rối mắt
    if (Math.random() > 0.8 && depth < MAX_DEPTH - 2) {
        leaves.push(new Leaf(endX, endY, 12 + Math.random() * 8));
    }

    const newLen = len * (0.75 + Math.random() * 0.1);
    // Góc xòe hẹp và đều đặn hơn để không đan chéo
    const spread = (Math.PI / 6) * (0.8 + Math.random() * 0.2);

    // Đợi mọc xong các cành con
    await Promise.all([
        buildTree(endX, endY, newLen, angle - spread, depth - 1),
        buildTree(endX, endY, newLen, angle + spread, depth - 1)
    ]);
}

function drawTreeBranch(b) {
    const grad = ctx.createLinearGradient(b.x0, b.y0, b.x1, b.y1);
    grad.addColorStop(0, '#3e2723');
    grad.addColorStop(1, '#6d4c41'); // Nâu sáng hơn chút đỉnh để vỏ cây có hồn

    ctx.beginPath();
    ctx.moveTo(b.x0, b.y0);
    ctx.lineTo(b.x1, b.y1);
    ctx.strokeStyle = grad;
    ctx.lineWidth = b.thickness;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    if (state === 'FALLING') {
        seed.speed += 0.05;
        seed.y += seed.speed;
        seed.glow += 0.15;

        ctx.shadowBlur = 15 + Math.sin(seed.glow) * 10;
        ctx.shadowColor = '#ff0844';
        ctx.beginPath();
        ctx.arc(seed.x, seed.y, seed.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0844';
        ctx.fill();
        ctx.shadowBlur = 0;

        if (seed.y >= groundY) {
            seed.y = groundY;
            state = 'GROUND_SPREAD';
        }
    }

    if (state === 'GROUND_SPREAD') {
        groundWidth += 18;

        ctx.beginPath();
        ctx.moveTo(seed.x - groundWidth, groundY);
        ctx.lineTo(seed.x + groundWidth, groundY);
        ctx.strokeStyle = '#ffb3c6';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(seed.x, seed.y, seed.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0844';
        ctx.fill();

        if (groundWidth >= width) {
            state = 'GROWING'; // Khóa state lại để hàm if này không chạy vòng lặp nữa

            // Kích hoạt mọc cây chậm rãi
            buildTree(seed.x, groundY, height / 5, -Math.PI / 2, MAX_DEPTH).then(() => {
                // Chỉ khi Promise buildTree chạy XONG 100%, mới đổi trạng thái sang DONE
                state = 'DONE';

                // Đợi thêm 2 giây để khán giả ngắm cây nảy nở trọn vẹn
                setTimeout(() => {
                    canvas.classList.add('shift-right');

                    contentLeft.classList.remove('hidden');
                    setTimeout(() => {
                        contentLeft.classList.add('fade-in');
                        mainFooter.classList.remove('hidden');
                        setTimeout(() => {
                            mainFooter.classList.add('fade-in');
                            mainFooter.classList.add('shift-right');
                        }, 500);
                    }, 50);
                }, 2000);
            });
        }
    }

    if (state === 'GROWING' || state === 'DONE') {
        ctx.beginPath();
        ctx.moveTo(-width, groundY);
        ctx.lineTo(width * 2, groundY);
        ctx.strokeStyle = '#ffb3c6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Trong lúc cây đang mọc (async), mảng branches sẽ được update liên tục
        branches.forEach(drawTreeBranch);

        for (let i = leaves.length - 1; i >= 0; i--) {
            leaves[i].update();
            leaves[i].draw();
            if (leaves[i].y > groundY + 30) leaves.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

introScreen.addEventListener('click', (e) => {
    introScreen.style.opacity = '0';
    setTimeout(() => {
        introScreen.classList.add('hidden');
        seed.x = width / 2;
        seed.y = height / 2 - 50;
        groundY = height * 0.85;
        groundWidth = 0;
        state = 'FALLING';
    }, 1000);
});

animate();

// --- ĐỒNG HỒ ---
setInterval(() => {
    const now = new Date();
    document.getElementById('clock-time').innerText = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateOptions = { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('clock-date').innerText = now.toLocaleDateString('vi-VN', dateOptions);
}, 1000);