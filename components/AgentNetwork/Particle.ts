export class Particle {
    x: number
    y: number
    vx: number
    vy: number
    life: number
    initialLife: number
    size: number
    baseX: number
    baseY: number
    oscAngle: number
    oscSpeed: number
    oscAmp: number
    color: string

    constructor(x: number, y: number, targetX: number, targetY: number, color: string) {
        this.baseX = x
        this.baseY = y
        this.color = color
        this.size = Math.random() * 1.5 + 0.8
        this.life = 70 + Math.random() * 50
        this.initialLife = this.life

        const angle = Math.atan2(targetY - y, targetX - x)
        const speed = 1 + Math.random() * 1.5
        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed

        this.oscAngle = Math.random() * 2 * Math.PI
        this.oscSpeed = 0.07 + Math.random() * 0.1
        this.oscAmp = 2.5 + Math.random() * 5
    }

    update() {
        this.baseX += this.vx
        this.baseY += this.vy
        this.oscAngle += this.oscSpeed

        const perpAngle = Math.atan2(this.vy, this.vx) + Math.PI / 2
        const offsetX = Math.cos(perpAngle) * Math.sin(this.oscAngle) * this.oscAmp
        const offsetY = Math.sin(perpAngle) * Math.sin(this.oscAngle) * this.oscAmp

        this.x = this.baseX + offsetX
        this.y = this.baseY + offsetY
        this.life -= 1
    }

    draw(ctx: CanvasRenderingContext2D) {
        const alpha = Math.max(0, this.life / this.initialLife)
        ctx.beginPath()
        ctx.globalAlpha = alpha * 0.8
        ctx.fillStyle = this.color
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1.0
    }
}
