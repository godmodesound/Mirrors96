/** One canonical, dependency-free kernel for previews and both native/web scopes.
 * No oscillator, random particles or clock-driven geometry is created here.
 * The renderer only consumes measured frequency and RMS from the session bus.
 */
export const CYMATIC_RUNTIME = String.raw`
var MirrorsCymatics=(function(){
  var BG=[5,6,12];
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function plate(x,y,n,m){return Math.abs(Math.cos(n*Math.PI*x)*Math.cos(m*Math.PI*y)-Math.cos(m*Math.PI*x)*Math.cos(n*Math.PI*y));}
  function disc(r,theta,k,m){return Math.cos(k*r*Math.PI)*Math.cos(m*theta);}
  function signal(frame,now){
    var rms=Number.isFinite(frame.rms)?frame.rms:0;
    if(!Number.isFinite(frame.rms)&&frame.wave&&frame.wave.length){
      var sum=0;for(var i=0;i<frame.wave.length;i++){var v=(frame.wave[i]-128)/128;sum+=v*v;}rms=Math.sqrt(sum/frame.wave.length);
    }
    var hz=Number(frame.measuredHz)||0;
    var active=now-(frame.ts||0)<400&&rms>0.0005&&hz>=10;
    return {hz:active?hz:0,rms:active?rms:0,active:active};
  }
  function modes(hz,rms){
    var band=clamp(Math.log2(Math.max(20,hz)/55),-1,8);
    var n=clamp(2+Math.round(band),2,11);
    var m=clamp(1+Math.round(band*0.6),1,n-1);
    var k=clamp(2+Math.round(band*1.35),1,12);
    var energy=clamp(Math.sqrt(Math.max(0,rms))*2.3,0,1);
    var tightness=(0.028-0.017*energy)/(1+0.09*Math.max(0,band));
    return {n:n,m:m,k:k,tightness:tightness,energy:energy};
  }
  function renderer(resolution){
    var S=resolution||168,N=S*S,field=new Float32Array(N),distance=new Float32Array(N),mask=new Uint8Array(N);
    var texture=document.createElement('canvas');texture.width=texture.height=S;
    var tc=texture.getContext('2d'),image=tc.createImageData(S,S),pixels=image.data;
    var cacheKey='',paintKey='',lastHz=432,diagnostic={};
    function rebuild(kind,p){
      var scale=2.12/(S-1);
      var cn=new Float32Array(S),cm=new Float32Array(S);
      for(var a=0;a<S;a++){var coordinate=-1.06+a*scale;cn[a]=Math.cos(p.n*Math.PI*coordinate);cm[a]=Math.cos(p.m*Math.PI*coordinate);}
      for(var y=0;y<S;y++)for(var x=0;x<S;x++){
        var i=y*S+x,px=-1.06+x*scale,py=-1.06+y*scale;
        var r=Math.sqrt(px*px+py*py);
        // Keep the signed difference for its gradient; |field| below is exactly the requested Plate formula.
        field[i]=kind==='plate'?cn[x]*cm[y]-cm[x]*cn[y]:disc(r,Math.atan2(py,px),p.k,p.m);
        mask[i]=(kind==='plate'?Math.abs(px)<=1&&Math.abs(py)<=1:r<=1)?1:0;
      }
      for(var j=0;j<S;j++)for(var l=0;l<S;l++){
        var at=j*S+l;
        var dx=(field[j*S+Math.min(S-1,l+1)]-field[j*S+Math.max(0,l-1)])/(2*scale);
        var dy=(field[Math.min(S-1,j+1)*S+l]-field[Math.max(0,j-1)*S+l])/(2*scale);
        // Distance-normalisation keeps glow width consistent without moving any nodal zero.
        distance[at]=Math.abs(field[at])/Math.max(0.35,Math.sqrt(dx*dx+dy*dy));
      }
    }
    function paint(kind,input){
      if(input.active)lastHz=input.hz;
      var p=modes(lastHz,input.rms),brightness=input.active?0.55+0.45*p.energy:0.32;
      var key=kind+':'+p.n+':'+p.m+':'+p.k;
      if(key!==cacheKey){rebuild(kind,p);cacheKey=key;paintKey='';}
      var sig=Math.round(p.tightness*100000)/100000;
      var next=key+':'+sig+':'+Math.round(brightness*1000);
      diagnostic={mode:kind,hz:input.hz,rms:input.rms,active:input.active,n:p.n,m:p.m,k:p.k,tightness:sig};
      if(next===paintKey)return;
      paintKey=next;
      // Red halo, teal inner glow and a white nodal core. Lookup avoids per-pixel exponentials each frame.
      var lut=new Float32Array(256*3);
      for(var b=0;b<256;b++){
        var d=b/32,halo=Math.exp(-d*d/18),teal=Math.exp(-d*d/3),core=Math.exp(-d*d*2);
        lut[b*3]=brightness*(72*halo+230*core);
        lut[b*3+1]=brightness*(126*teal+205*core);
        lut[b*3+2]=brightness*(148*teal+205*core);
      }
      for(var q=0;q<N;q++){
        var o=q*4;
        if(!mask[q]){pixels[o]=BG[0];pixels[o+1]=BG[1];pixels[o+2]=BG[2];pixels[o+3]=255;continue;}
        var b2=Math.min(255,Math.round(distance[q]/sig*32))*3;
        pixels[o]=Math.min(255,BG[0]+lut[b2]);pixels[o+1]=Math.min(255,BG[1]+lut[b2+1]);pixels[o+2]=Math.min(255,BG[2]+lut[b2+2]);pixels[o+3]=255;
      }
      tc.putImageData(image,0,0);
    }
    return {
      draw:function(context,kind,input,x,y,size){
        paint(kind,input);context.save();context.globalAlpha=1;context.globalCompositeOperation='source-over';
        context.imageSmoothingEnabled=true;context.drawImage(texture,x,y,size,size);
        context.strokeStyle=input.active?'rgba(119,223,214,0.3)':'rgba(144,169,184,0.15)';context.lineWidth=0.7;
        var edge=size*0.0283;
        if(kind==='disc'){context.beginPath();context.arc(x+size/2,y+size/2,size/2-edge,0,Math.PI*2);context.stroke();}
        else context.strokeRect(x+edge,y+edge,size-edge*2,size-edge*2);
        context.restore();
      },
      state:function(){return diagnostic;}
    };
  }
  return {background:'#05060c',plate:plate,disc:disc,signal:signal,modes:modes,renderer:renderer};
})();
`;