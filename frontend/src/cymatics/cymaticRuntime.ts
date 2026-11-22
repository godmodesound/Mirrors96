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
  // ── Full-spectrum colour: raise the tone octave by octave until it lands in visible light
  // (400–800 THz is exactly one octave), then name the closest Pantone reference for that wavelength.
  // Pantone values are nearest-match approximations, not licensed colour data.
  var PANTONE=[
    [400,'MEDIUM PURPLE C',78,0,142],[420,'VIOLET C',68,0,153],[440,'2735 C',46,0,139],[455,'BLUE 072 C',16,6,159],
    [468,'REFLEX BLUE C',0,20,137],[480,'300 C',0,94,184],[490,'PROCESS BLUE C',0,133,202],[498,'3125 C',0,174,199],
    [508,'GREEN C',0,171,132],[525,'354 C',0,177,64],[545,'802 C',68,214,44],[560,'375 C',151,215,0],
    [570,'380 C',219,228,66],[580,'YELLOW C',254,221,0],[590,'116 C',255,205,0],[600,'137 C',255,163,0],
    [612,'151 C',255,130,0],[625,'ORANGE 021 C',254,80,0],[645,'WARM RED C',249,66,58],[680,'485 C',218,41,28],
    [720,'186 C',200,16,46],[9999,'187 C',166,25,46]
  ];
  var lightCache={};
  function light(hz){
    hz=Math.max(0.01,Number(hz)||432);
    var key=hz.toPrecision(5);if(lightCache[key])return lightCache[key];
    var octaves=Math.ceil(Math.log2(4e14/hz)),visible=hz*Math.pow(2,octaves),nm=299792458/visible*1e9;
    var row=PANTONE[PANTONE.length-1];
    for(var i=0;i<PANTONE.length;i++){if(nm<PANTONE[i][0]){row=PANTONE[i];break;}}
    var rgb=[row[2],row[3],row[4]],boost=Math.max(1,225/Math.max(rgb[0],rgb[1],rgb[2]));
    // "lit" keeps the Pantone hue but lifts dark inks so they stay readable as light on a black scope.
    var lit=[Math.min(255,rgb[0]*boost+18),Math.min(255,rgb[1]*boost+18),Math.min(255,rgb[2]*boost+18)];
    return lightCache[key]={hz:hz,octaves:octaves,thz:visible/1e12,nm:nm,name:row[1],rgb:rgb,lit:lit};
  }
  function fmtHz(hz){return hz>=1000?(hz/1000).toFixed(2)+' kHz':hz.toFixed(hz<100?2:1)+' Hz';}
  /** On-canvas readout: dominant driver's light equivalent + a Pantone swatch per sounding partial. */
  function readout(context,drivers,cx,bottom){
    if(!drivers||!drivers.length)return;
    var top=drivers[0];for(var i=1;i<drivers.length;i++)if((drivers[i].a||0)>(top.a||0))top=drivers[i];
    var L=light(top.f);
    var line1=fmtHz(L.hz)+'  +'+L.octaves+' OCT → '+L.thz.toFixed(1)+' THz · '+Math.round(L.nm)+' nm';
    var line2='≈ PANTONE '+L.name;
    context.save();context.globalAlpha=1;context.globalCompositeOperation='source-over';
    context.font='bold 9px monospace';context.textAlign='center';context.textBaseline='alphabetic';
    var count=Math.min(6,drivers.length),sw=count*11,w=Math.max(context.measureText(line1).width,context.measureText(line2).width+sw+6)+14;
    context.fillStyle='rgba(0,0,0,0.62)';context.fillRect(cx-w/2,bottom-30,w,28);
    context.fillStyle='rgb('+Math.round(L.lit[0])+','+Math.round(L.lit[1])+','+Math.round(L.lit[2])+')';
    context.fillText(line1,cx,bottom-18);
    var tw=context.measureText(line2).width,x0=cx-(tw+sw+6)/2;
    for(var s=0;s<count;s++){var c=light(drivers[s].f).rgb;context.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';context.fillRect(x0+s*11,bottom-14,9,9);context.strokeStyle='rgba(255,255,255,0.5)';context.lineWidth=0.5;context.strokeRect(x0+s*11,bottom-14,9,9);}
    context.fillStyle='rgba(255,255,255,0.92)';context.textAlign='left';context.fillText(line2,x0+sw+6,bottom-6);
    context.restore();
  }
  function renderer(resolution){
    var S=resolution||168,N=S*S,field=new Float32Array(N),distance=new Float32Array(N),mask=new Uint8Array(N);
    var texture=document.createElement('canvas');texture.width=texture.height=S;
    var tc=texture.getContext('2d'),image=tc.createImageData(S,S),pixels=image.data;
    var cacheKey='',paintKey='',lastHz=432,diagnostic={},edgeRgb='rgba(144,169,184,';
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
      var L=light(lastHz),col=L.lit;
      var next=key+':'+sig+':'+Math.round(brightness*1000)+':'+L.name;
      diagnostic={mode:kind,hz:input.hz,lightHz:lastHz,rms:input.rms,active:input.active,n:p.n,m:p.m,k:p.k,tightness:sig,thz:L.thz,nm:L.nm,pantone:L.name};
      edgeRgb='rgba('+Math.round(col[0])+','+Math.round(col[1])+','+Math.round(col[2])+',';
      if(next===paintKey)return;
      paintKey=next;
      // Pantone-of-the-frequency halo and inner glow around a white nodal core. Lookup avoids per-pixel exponentials each frame.
      var lut=new Float32Array(256*3);
      for(var b=0;b<256;b++){
        var d=b/32,glow=0.30*Math.exp(-d*d/18)+0.62*Math.exp(-d*d/3),core=Math.exp(-d*d*2);
        lut[b*3]=brightness*(col[0]*glow+205*core);
        lut[b*3+1]=brightness*(col[1]*glow+205*core);
        lut[b*3+2]=brightness*(col[2]*glow+205*core);
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
        context.strokeStyle=edgeRgb+(input.active?'0.4)':'0.18)');context.lineWidth=0.7;
        var edge=size*0.0283;
        if(kind==='disc'){context.beginPath();context.arc(x+size/2,y+size/2,size/2-edge,0,Math.PI*2);context.stroke();}
        else context.strokeRect(x+edge,y+edge,size-edge*2,size-edge*2);
        context.restore();
      },
      state:function(){return diagnostic;}
    };
  }
  return {background:'#05060c',plate:plate,disc:disc,signal:signal,modes:modes,renderer:renderer,light:light,readout:readout};
})();
`;