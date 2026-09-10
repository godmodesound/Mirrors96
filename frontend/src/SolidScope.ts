// Shared canvas fragment, used by both native WebViews and preview frames.
// Live level changes brightness only; spatial motion is explicitly opt-in.
export const SOLID_SCOPE_JS = `
function drawSolidField(R,p,env){
  ctx.save();ctx.globalAlpha=1;
  var fill=ctx.createRadialGradient(CX,CY,0,CX,CY,Math.max(1,R));
  fill.addColorStop(0,'rgba(27,48,65,'+(0.65+env*0.2)+')');
  fill.addColorStop(1,'rgba(6,13,20,1)');
  ctx.fillStyle=fill;ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=p.main;ctx.lineWidth=1.5;ctx.globalAlpha=0.7;
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.stroke();ctx.restore();
}
`;